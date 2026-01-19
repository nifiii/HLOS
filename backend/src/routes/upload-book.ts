import express, { Request, Response } from 'express';
import multer from 'multer';
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
    return res.status(500).json({
      success: false,
      error: error.message || '文件解析失败',
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

export default router;
