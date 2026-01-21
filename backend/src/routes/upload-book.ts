import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { extractPDFMetadata, parsePDF } from '../services/pdfParser.js';
import { parseEPUB } from '../services/epubParser.js';
import { analyzeBookMetadata } from '../services/bookMetadataAnalyzer.js';

const router = express.Router();

// 配置 multer 用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB 限制
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/epub+zip',
      'text/plain',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，仅支持 PDF、EPUB、TXT'));
    }
  },
});

/**
 * POST /api/upload-book
 * 上传并解析图书文件（原始接口，兼容其他用途）
 */
router.post('/upload-book', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '未上传文件',
      });
    }

    const file = req.file;
    const fileFormat = getFileFormat(file.mimetype);

    console.log(`开始解析 ${fileFormat.toUpperCase()} 文件: ${file.originalname}`);

    let parseResult;

    switch (fileFormat) {
      case 'pdf':
        parseResult = await parsePDF(file.buffer);
        break;

      case 'epub':
        parseResult = await parseEPUB(file.buffer);
        break;

      case 'txt':
        // TXT 文件直接读取文本内容
        parseResult = {
          content: file.buffer.toString('utf-8'),
          pageCount: 1,
          estimatedMetadata: {},
          tableOfContents: [],
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `不支持的文件格式: ${fileFormat}`,
        });
    }

    // 使用 Gemini 分析元数据
    console.log('开始 AI 元数据分析...');
    const aiMetadata = await analyzeBookMetadata(
      parseResult.content,
      parseResult.tableOfContents,
      file.originalname
    );

    // 返回解析结果和 AI 元数据
    return res.json({
      success: true,
      data: {
        fileName: file.originalname,
        fileFormat,
        fileSize: file.size,
        pageCount: parseResult.pageCount,
        content: parseResult.content,
        // 合并初步元数据和 AI 元数据
        metadata: {
          ...parseResult.estimatedMetadata,
          ...aiMetadata,
        },
      },
    });
  } catch (error) {
    console.error('文件解析失败:', error);
    const message = error instanceof Error ? error.message : '文件解析失败';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/upload-book/parse
 * 解析已上传的图书文件（通过文件路径，只提取元数据，不调用 AI）
 */
router.post('/upload-book/parse', async (req: Request, res: Response) => {
  try {
    const { filePath, fileName } = req.body;

    if (!filePath || !fileName) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
      });
    }

    // 安全检查：确保 filePath 在 uploads 目录内
    const safePath = path.normalize(filePath);
    const fullPath = path.join(process.cwd(), safePath);

    if (!fullPath.startsWith(path.join(process.cwd(), 'uploads'))) {
      return res.status(400).json({
        success: false,
        error: '非法的文件路径',
      });
    }

    console.log(`开始提取元数据: ${fileName}`);

    // 读取文件
    const fileBuffer = await fs.readFile(fullPath);
    const fileFormat = getFileFormatFromFileName(fileName);

    console.log(`文件格式: ${fileFormat}`);

    let basicMetadata;
    let pageCount = 0;

    try {
      switch (fileFormat) {
        case 'pdf':
          console.log('提取 PDF 内置元数据...');
          const pdfData = await extractPDFMetadata(fileBuffer);
          basicMetadata = pdfData.estimatedMetadata;
          pageCount = pdfData.pageCount;
          console.log(`PDF 元数据提取成功，页数: ${pageCount}`);
          console.log(`内置元数据:`, JSON.stringify(basicMetadata));
          break;
        case 'epub':
          console.log('解析 EPUB...');
          const epubData = await parseEPUB(fileBuffer);
          basicMetadata = epubData.estimatedMetadata;
          pageCount = epubData.pageCount;
          console.log(`EPUB 解析成功，页数: ${pageCount}`);
          break;
        case 'txt':
          basicMetadata = {};
          pageCount = 1;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `不支持的文件格式: ${fileFormat}`
          });
      }

      // 如果内置元数据为空，使用文件名作为默认书名
      const finalMetadata = {
        title: basicMetadata.title || fileName.replace(/\.(pdf|epub|txt)$/i, ''),
        author: basicMetadata.author || '',
        subject: '',
        category: '教材',
        grade: '',
        tags: []
      };

      console.log('返回的元数据:', finalMetadata);

      // 返回元数据（不调用 AI）
      return res.json({
        success: true,
        data: {
          fileName: fileName,
          fileFormat,
          fileSize: fileBuffer.length,
          pageCount: pageCount,
          metadata: finalMetadata,
        },
      });
    } catch (parseError) {
      console.error('文件解析失败:', parseError);

      // 解析失败时使用文件名作为默认值
      const fallbackMetadata = {
        title: fileName.replace(/\.(pdf|epub|txt)$/i, ''),
        author: '',
        subject: '',
        category: '教材',
        grade: '',
        tags: []
      };

      console.log('使用默认元数据:', fallbackMetadata);

      return res.json({
        success: true,
        data: {
          fileName: fileName,
          fileFormat,
          fileSize: fileBuffer.length,
          pageCount: 0,
          metadata: fallbackMetadata,
        },
      });
    }
  } catch (error) {
    console.error('请求处理失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '请求处理失败',
    });
  }
});

/**
 * 根据 MIME 类型获取文件格式
 */
function getFileFormat(mimeType: string): 'pdf' | 'epub' | 'txt' {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  } else if (mimeType === 'application/epub+zip') {
    return 'epub';
  } else if (mimeType === 'text/plain') {
    return 'txt';
  }
  throw new Error(`未知的 MIME 类型: ${mimeType}`);
}

/**
 * 根据文件名获取文件格式
 */
function getFileFormatFromFileName(fileName: string): 'pdf' | 'epub' | 'txt' {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.epub') return 'epub';
  if (ext === '.txt') return 'txt';
  return 'pdf'; // 默认
}

export default router;
