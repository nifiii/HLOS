import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { parsePDF } from '../services/pdfParser.js';
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
 * 上传并解析图书文件
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

/**
 * POST /api/upload-book/parse
 * 解析已上传的图书文件（通过文件路径）
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

    console.log(`开始解析已上传文件: ${fileName}`);
    console.log(`文件路径: ${fullPath}`);
    console.log(`文件大小: ${fileBuffer.length} bytes`);

    // 读取文件
    const fileBuffer = await fs.readFile(fullPath);
    const fileFormat = getFileFormatFromFileName(fileName);

    console.log(`文件格式: ${fileFormat}`);

    let parseResult;

    try {
      switch (fileFormat) {
        case 'pdf':
          console.log('开始 PDF 解析...');
          parseResult = await parsePDF(fileBuffer);
          console.log(`PDF 解析成功，页数: ${parseResult.pageCount}`);
          break;
        case 'epub':
          console.log('开始 EPUB 解析...');
          parseResult = await parseEPUB(fileBuffer);
          console.log(`EPUB 解析成功，页数: ${parseResult.pageCount}`);
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
          return res.status(400).json({
            success: false,
            error: `不支持的文件格式: ${fileFormat}`
          });
      }

      console.log(`文本内容长度: ${parseResult.content.length} 字符`);
      console.log(`目录章节数: ${parseResult.tableOfContents.length}`);
    } catch (parseError) {
      console.error('文件解析失败:', parseError);
      return res.status(500).json({
        success: false,
        error: `文件解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`
      });
    }

    // 使用 Gemini 分析元数据
    console.log('开始 AI 元数据分析...');
    let aiMetadata;
    try {
      aiMetadata = await analyzeBookMetadata(
        parseResult.content,
        parseResult.tableOfContents,
        fileName
      );
      console.log('AI 解析完成:', JSON.stringify(aiMetadata, null, 2));
    } catch (aiError) {
      console.error('AI 分析失败:', aiError);
      // AI 失败时使用默认元数据
      aiMetadata = {
        title: fileName.replace(/\.(pdf|epub|txt)$/i, ''),
        author: '',
        subject: '',
        category: '教材',
        grade: '',
        tags: []
      };
    }

    // 返回解析结果和 AI 元数据
    return res.json({
      success: true,
      data: {
        fileName: fileName,
        fileFormat,
        fileSize: fileBuffer.length,
        pageCount: parseResult.pageCount,
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

export default router;
