import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { convertToMarkdown } from '../services/llmService.js';
import {
  saveBookFile,
  saveBookCover,
  saveBookMarkdown,
  updateMetadataIndex
} from '../services/fileStorage.js';
import fetch from 'node-fetch';

const router = express.Router();

const ANYTHINGLLM_BASE_URL = process.env.ANYTHINGLLM_ENDPOINT || 'http://localhost:3001';
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;

// 配置 multer (不再用于接收文件流，因为现在是纯 JSON 请求)
const upload = multer();

// 用户名映射
const USER_NAMES: Record<string, string> = {
  'child_1': '大宝',
  'child_2': '二宝',
  'shared': '共享',
};

/**
 * POST /api/save-book
 * 保存教材到文件系统、生成 Markdown 并索引到 AnythingLLM
 * 接收参数：metadata (JSON), coverImage (path), tempFilePath (path)
 */
router.post('/save-book', upload.none(), async (req: Request, res: Response) => {
  try {
    const { metadata, coverImage, tempFilePath, ownerId = 'shared' } = req.body;

    if (!metadata || !tempFilePath) {
      console.error('[saveBook] 缺少参数:', { metadata: !!metadata, tempFilePath: !!tempFilePath });
      return res.status(400).json({
        success: false,
        error: '缺少必要参数 (metadata, tempFilePath)',
      });
    }

    // 解析 metadata
    const bookMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    const { title, subject, category } = bookMetadata;
    const userName = USER_NAMES[ownerId] || '共享';
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[saveBook] >>> 收到保存请求: ${title} (${subject}), ID: ${bookId}`);

    // 1. 路径修复与验证
    // 兼容多种路径格式: /uploads/temp/... 或 uploads/temp/... 或 绝对路径
    let relativePath = tempFilePath;
    if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
    
    // 生产环境 WorkingDirectory 是 /opt/hl-os/backend，uploads 在同级或上级
    // 根据 index.ts: app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
    // 说明 uploads 就在 process.cwd() 下
    const absoluteTempPath = path.isAbsolute(tempFilePath) 
      ? tempFilePath 
      : path.join(process.cwd(), relativePath);

    console.log(`[saveBook] [1/5] 验证临时文件: ${absoluteTempPath}`);
    try {
      await fs.access(absoluteTempPath);
    } catch (accessErr) {
      console.error(`[saveBook] ❌ 临时文件不存在: ${absoluteTempPath}`);
      return res.status(404).json({ 
        success: false,
        error: `临时文件不存在或已过期: ${tempFilePath}`,
      });
    }

    // 2. 移动并归档原始文件
    console.log(`[saveBook] [2/5] 正在归档原始文件...`);
    const fileBuffer = await fs.readFile(absoluteTempPath);
    const originalFileName = path.basename(absoluteTempPath);
    const savedFilePath = await saveBookFile(fileBuffer, originalFileName, ownerId, subject, userName);
    console.log(`[saveBook] ✓ 原始文件已归档: ${savedFilePath}`);

    // 3. 处理封面图片
    console.log(`[saveBook] [3/5] 正在处理封面图片...`);
    let webCoverPath = null;
    let obsidianCoverPath = null;

    if (coverImage) {
      let relativeCover = coverImage;
      if (relativeCover.startsWith('/')) relativeCover = relativeCover.slice(1);
      const tempCoverPath = path.join(process.cwd(), relativeCover);
      
      try {
        await fs.access(tempCoverPath);
        const coverFileName = path.basename(tempCoverPath);
        const savedFileName = await saveBookCover(tempCoverPath, coverFileName);
        webCoverPath = `/covers/${savedFileName}`;
        obsidianCoverPath = `[[${savedFileName}]]`;
        console.log(`[saveBook] ✓ 封面已归档: ${savedFileName}`);
      } catch (err) {
        console.warn(`[saveBook] ⚠️ 封面图片处理失败 (跳过): ${coverImage}`);
      }
    }

    // 4. 立即更新数据库状态为 'processing' 并返回成功
    console.log(`[saveBook] [4/5] 正在创建数据库记录...`);
    const initialEntry = {
      id: bookId,
      ...bookMetadata,
      ownerId,
      userName,
      timestamp: Date.now(),
      filePath: savedFilePath,
      imagePath: webCoverPath || undefined,
      status: 'processing'
    };
    await updateMetadataIndex(initialEntry);

    // 返回成功响应给前端，让用户先行跳转
    res.json({
      success: true,
      data: {
        id: bookId,
        title,
        status: 'processing'
      },
    });

    // 5. 异步执行重型任务 (Markdown 转换 & AnythingLLM 索引)
    // 使用 setImmediate 确保响应已发出
    setImmediate(async () => {
      console.log(`[saveBook] [5/5] [Async] 开始后台处理任务: ${bookId}`);
      try {
        // A. 生成 Markdown 内容
        console.log(`[saveBook] [Async] 正在解析 PDF 文本内容...`);
        const { parsePDF } = await import('../services/pdfParser.js');
        const parseResult = await parsePDF(fileBuffer);
        const contentText = parseResult.content;
        
        console.log(`[saveBook] [Async] 正在调用 LLM 转换为 Markdown (长度: ${contentText.length})...`);
        const markdownContent = await convertToMarkdown(contentText);
        
        // B. 保存 Obsidian Markdown 文件
        const metadataForSave = { ...bookMetadata, coverImage: obsidianCoverPath || '' };
        const mdFilePath = await saveBookMarkdown(metadataForSave, markdownContent, ownerId, userName);
        console.log(`[saveBook] [Async] ✓ Markdown 已保存: ${mdFilePath}`);

        // C. 推送到 AnythingLLM
        if (ANYTHINGLLM_API_KEY) {
          console.log(`[saveBook] [Async] 正在索引到 AnythingLLM...`);
          await indexBookToAnythingLLM(
            bookId,
            ownerId,
            bookMetadata,
            contentText,
            savedFilePath
          );
        }

        // D. 更新最终状态
        await updateMetadataIndex({
          ...initialEntry,
          mdPath: mdFilePath,
          status: 'completed'
        });
        console.log(`[saveBook] [Async] 🎉 全部后台任务完成: ${bookId}`);

        // E. 清理临时文件
        await fs.unlink(absoluteTempPath).catch(() => {});
        
      } catch (asyncErr) {
        console.error(`[saveBook] [Async] ❌ 后台处理失败: ${bookId}`, asyncErr);
        await updateMetadataIndex({
          ...initialEntry,
          status: 'failed'
        }).catch(() => {});
      }
    });

  } catch (error) {
    console.error('[saveBook] ❌ 严重错误:', error);
    const message = error instanceof Error ? error.message : '保存失败';
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
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
