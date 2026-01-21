import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { parsePDF } from '../services/pdfParser.js';
import { parseEPUB } from '../services/epubParser.js';
import { analyzeBookMetadata } from '../services/bookMetadataAnalyzer.js';

const router = express.Router();

// 临时目录配置
const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'files');

// 确保目录存在
const ensureDirs = async () => {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
};

// Multer 配置（内存存储）
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per chunk
    fieldSize: 1 * 1024 * 1024   // 1MB for form fields
  }
});

/**
 * POST /api/upload-chunk
 * 分片上传接口（无 action 参数时触发）
 */
router.post('/upload-chunk', upload.single('chunk'), async (req: Request, res: Response) => {
  try {
    // 检查是否为合并请求
    if (req.query.action === 'merge') {
      return handleMerge(req, res);
    }

    await ensureDirs();

    console.log('收到的 req.body:', req.body);
    console.log('收到的 req.file:', req.file ? '存在' : '不存在');

    const { chunkIndex, totalChunks, fileId, fileName, ownerId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: '没有上传文件' });
    }

    // 验证参数
    if (chunkIndex === undefined || totalChunks === undefined || !fileId || !fileName || !ownerId) {
      console.error('参数验证失败:', { chunkIndex, totalChunks, fileId, fileName, ownerId });
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 验证并净化 fileId (防止路径遍历攻击)
    if (!/^[a-zA-Z0-9\-._]+$/.test(fileId)) {
      return res.status(400).json({ success: false, error: 'fileId 格式无效' });
    }

    // 净化 fileName (仅保留文件名，移除路径)
    const safeFileName = path.basename(fileName);

    // 验证分片参数
    const chunkIndexNum = parseInt(chunkIndex);
    const totalChunksNum = parseInt(totalChunks);

    if (isNaN(chunkIndexNum) || isNaN(totalChunksNum)) {
      return res.status(400).json({ success: false, error: '分片参数格式无效' });
    }

    if (chunkIndexNum < 0 || chunkIndexNum >= totalChunksNum) {
      return res.status(400).json({ success: false, error: '分片索引超出范围' });
    }

    if (totalChunksNum > 10000) {
      return res.status(400).json({ success: false, error: '分片数量超出限制' });
    }

    // 创建文件专属临时目录
    const chunkDir = path.join(TEMP_DIR, fileId);
    await fs.mkdir(chunkDir, { recursive: true });

    // 保存分片
    const chunkPath = path.join(chunkDir, `chunk-${chunkIndexNum}`);
    await fs.writeFile(chunkPath, req.file.buffer);

    console.log(`分片 ${chunkIndexNum + 1}/${totalChunksNum} 保存成功: ${fileId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('分片上传失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 处理分片合并
 */
async function handleMerge(req: Request, res: Response): Promise<void> {
  let mergeCompleted = false;
  let finalPath = '';

  try {
    await ensureDirs();

    const { fileId, fileName, ownerId } = req.body;

    if (!fileId || !fileName || !ownerId) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    // 验证并净化 fileId (防止路径遍历攻击)
    if (!/^[a-zA-Z0-9\-._]+$/.test(fileId)) {
      res.status(400).json({ success: false, error: 'fileId 格式无效' });
      return;
    }

    // 净化 fileName (仅保留文件名，移除路径)
    const safeFileName = path.basename(fileName);

    const chunkDir = path.join(TEMP_DIR, fileId);

    // 检查分片目录是否存在
    try {
      await fs.access(chunkDir);
    } catch {
      res.status(404).json({ success: false, error: '分片文件不存在' });
      return;
    }

    // 读取所有分片
    const chunks = await fs.readdir(chunkDir);
    chunks.sort((a, b) => {
      const indexA = parseInt(a.split('-')[1]);
      const indexB = parseInt(b.split('-')[1]);
      return indexA - indexB;
    });

    // 生成最终文件路径
    const ext = path.extname(safeFileName);
    const finalFileName = `${uuidv4()}${ext}`;
    finalPath = path.join(UPLOAD_DIR, finalFileName);

    // 合并分片（使用流式写入避免大文件内存问题）
    const fileHandles = await Promise.all(
      chunks.map(chunk => fs.open(path.join(chunkDir, chunk), 'r'))
    );

    const writeHandle = await fs.open(finalPath, 'w');

    for (const handle of fileHandles) {
      const { buffer } = await handle.read();
      await writeHandle.write(buffer);
      await handle.close();
    }

    await writeHandle.close();

    mergeCompleted = true;

    // 清理临时分片
    await fs.rm(chunkDir, { recursive: true });

    // 返回相对路径（供前端使用）
    const relativePath = `/uploads/files/${finalFileName}`;

    console.log(`文件合并成功: ${safeFileName} -> ${relativePath}`);

    // 自动解析图书内容
    console.log('开始解析图书内容...');
    let parseResult;
    const fileBuffer = await fs.readFile(finalPath);
    const fileFormat = getFileFormat(safeFileName);

    try {
      switch (fileFormat) {
        case 'pdf':
          parseResult = await parsePDF(fileBuffer);
          break;
        case 'epub':
          parseResult = await parseEPUB(fileBuffer);
          break;
        case 'txt':
          parseResult = {
            content: fileBuffer.toString('utf-8'),
            pageCount: 1,
            estimatedMetadata: {},
            tableOfContents: [],
          };
          break;
        default:
          throw new Error(`不支持的文件格式: ${fileFormat}`);
      }

      // 使用 Gemini 分析元数据
      console.log('开始 AI 元数据分析...');
      const aiMetadata = await analyzeBookMetadata(
        parseResult.content,
        parseResult.tableOfContents,
        safeFileName
      );

      console.log('AI 解析完成，返回元数据');
      res.json({
        success: true,
        filePath: relativePath,
        metadata: {
          fileName: safeFileName,
          fileFormat,
          fileSize: fileBuffer.length,
          pageCount: parseResult.pageCount,
          ...aiMetadata,
        }
      });
    } catch (error) {
      console.error('图书解析失败:', error);
      // 即使解析失败，也返回文件路径
      res.json({
        success: true,
        filePath: relativePath,
        metadata: null,
        error: '图书解析失败，但文件已上传成功'
      });
    }
  } catch (error: any) {
    console.error('合并分片失败:', error);

    // 清理部分合并的文件
    if (!mergeCompleted && finalPath) {
      try {
        await fs.unlink(finalPath);
      } catch (e) {
        // 忽略删除失败
      }
    }

    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 根据文件名获取文件格式
 */
function getFileFormat(fileName: string): 'pdf' | 'epub' | 'txt' {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.epub') return 'epub';
  if (ext === '.txt') return 'txt';
  return 'pdf'; // 默认
}

export default router;
