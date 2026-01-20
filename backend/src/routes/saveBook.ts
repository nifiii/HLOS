import express, { Request, Response } from 'express';
import multer from 'multer';
import { parsePDF } from '../services/pdfParser.js';
import { parseEPUB } from '../services/epubParser.js';
import { analyzeBookMetadata } from '../services/bookMetadataAnalyzer.js';
import {
  saveBookFile,
  updateMetadataIndex
} from '../services/fileStorage.js';
import fetch from 'node-fetch';

const router = express.Router();

const ANYTHINGLLM_BASE_URL = process.env.ANYTHINGLLM_ENDPOINT || 'http://localhost:3001';
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;

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

// 用户名映射
const USER_NAMES: Record<string, string> = {
  'child_1': '大宝',
  'child_2': '二宝',
  'shared': '共享',
};

/**
 * POST /api/save-book
 * 保存教材到文件系统并索引到 AnythingLLM
 */
router.post('/save-book', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '未上传文件',
      });
    }

    const file = req.file;
    const ownerId = req.body.ownerId || 'shared';
    const fileFormat = getFileFormat(file.mimetype);

    console.log(`[saveBook] 开始保存教材: ${file.originalname}`);

    // 1. 保存原始文件到文件系统
    const filePath = await saveBookFile(file.buffer, file.originalname, ownerId);
    console.log(`[saveBook] 文件已保存: ${filePath}`);

    // 2. 解析文件内容
    let parseResult;
    switch (fileFormat) {
      case 'pdf':
        parseResult = await parsePDF(file.buffer);
        break;
      case 'epub':
        parseResult = await parseEPUB(file.buffer);
        break;
      case 'txt':
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

    // 3. 使用 Gemini 分析元数据
    console.log('[saveBook] 开始 AI 元数据分析...');
    const aiMetadata = await analyzeBookMetadata(
      parseResult.content,
      parseResult.tableOfContents,
      file.originalname
    );

    // 4. 生成教材ID
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 5. 更新元数据索引
    await updateMetadataIndex({
      id: bookId,
      type: 'textbook',
      ownerId,
      userName: USER_NAMES[ownerId] || '共享',
      subject: aiMetadata.subject || '综合',
      chapter: undefined,
      timestamp: Date.now(),
      filePath,
    });
    console.log('[saveBook] 元数据索引已更新');

    // 6. 推送到 AnythingLLM（异步，不阻塞响应）
    if (ANYTHINGLLM_API_KEY) {
      indexBookToAnythingLLM(
        bookId,
        ownerId,
        aiMetadata,
        parseResult.content,
        filePath
      ).catch(error => {
        console.error('[saveBook] AnythingLLM索引失败:', error);
      });
    }

    // 返回解析结果和 AI 元数据
    return res.json({
      success: true,
      data: {
        id: bookId,
        fileName: file.originalname,
        fileFormat,
        fileSize: file.size,
        pageCount: parseResult.pageCount,
        filePath,
        // 合并初步元数据和 AI 元数据
        metadata: {
          ...parseResult.estimatedMetadata,
          ...aiMetadata,
        },
      },
    });

  } catch (error) {
    console.error('[saveBook] 错误:', error);
    const message = error instanceof Error ? error.message : '文件保存失败';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * 异步索引教材到 AnythingLLM
 */
async function indexBookToAnythingLLM(
  bookId: string,
  ownerId: string,
  metadata: any,
  content: string,
  filePath: string
): Promise<void> {
  try {
    const response = await fetch(`${ANYTHINGLLM_BASE_URL}/api/v1/document/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        textContent: content,
        metadata: {
          source: 'book',
          bookId,
          ownerId,
          title: metadata.title,
          subject: metadata.subject,
          grade: metadata.grade,
          category: metadata.category,
          tags: metadata.tags,
          filePath,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AnythingLLM API error: ${response.statusText}`);
    }

    const result: any = await response.json();
    console.log(`[indexBookToAnythingLLM] 索引成功: ${result.documentId || result.id}`);

    // 更新元数据索引（添加 anythingLlmDocId）
    await updateMetadataIndex({
      id: bookId,
      type: 'textbook',
      ownerId,
      userName: USER_NAMES[ownerId] || '共享',
      subject: metadata.subject || '综合',
      timestamp: Date.now(),
      filePath,
      anythingLlmDocId: result.documentId || result.id,
    });

  } catch (error) {
    console.error('[indexBookToAnythingLLM] 失败:', error);
    throw error;
  }
}

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
