import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
  saveBookFile,
  saveBookCover,
  saveBookMarkdown,
  updateMetadataIndex
} from '../services/fileStorage.js';
import { convertToMarkdown } from '../services/llmService.js';

const router = express.Router();

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
 * 保存教材到文件系统、关联 Markdown 并更新数据库
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
    
    // 统一使用项目根目录拼接，避免 Linux 下以 / 开头被误认为根目录绝对路径
    const absoluteTempPath = path.join(process.cwd(), relativePath);

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

    // 4. 更新初步数据库记录 (标记为处理中)
    console.log(`[saveBook] [4/5] 正在更新数据库初步记录...`);
    const initialEntry = {
      id: bookId,
      ...bookMetadata,
      ownerId,
      userName,
      timestamp: Date.now(),
      filePath: savedFilePath,
      mdPath: undefined,
      imagePath: webCoverPath || undefined,
      status: 'processing'
    };
    await updateMetadataIndex(initialEntry);

    // 5. 返回成功响应给前端 (不再等待 Markdown 转换)
    res.json({
      success: true,
      data: {
        id: bookId,
        title,
        status: 'processing'
      },
    });

    // 6. 异步处理：转换 Markdown 并清理临时文件
    setImmediate(async () => {
      try {
        console.log(`[saveBook] [Async] 开始后台转换 Markdown: ${bookId}`);
        const tempTxtPath = absoluteTempPath.replace(path.extname(absoluteTempPath), '.txt');
        const tempMdPath = absoluteTempPath.replace(path.extname(absoluteTempPath), '.md');
        
        let mdFilePath = null;

        try {
          // 优先尝试读取已有的 .txt 文件 (由 upload 阶段生成)
          await fs.access(tempTxtPath);
          const content = await fs.readFile(tempTxtPath, 'utf-8');
          
          // 调用 AI 转换 Markdown
          const markdownContent = await convertToMarkdown(content);
          
          // 保存正式的 Markdown 文件
          const metadataForSave = { ...bookMetadata, coverImage: obsidianCoverPath || '' };
          mdFilePath = await saveBookMarkdown(metadataForSave, markdownContent, ownerId, userName);
          
          console.log(`[saveBook] [Async] ✓ Markdown 转换完成: ${mdFilePath}`);
          
          // 更新数据库记录为完成
          await updateMetadataIndex({
            ...initialEntry,
            mdPath: mdFilePath,
            status: 'completed'
          });
          
        } catch (convErr) {
          console.error(`[saveBook] [Async] ❌ Markdown 转换失败: ${bookId}`, convErr);
          // 即使转换失败，也把状态改为 completed 或 failed，这里选 completed 但 mdPath 为空
          await updateMetadataIndex({
            ...initialEntry,
            status: 'completed'
          });
        }

        // 清理所有临时文件
        try {
          await Promise.all([
            fs.unlink(absoluteTempPath).catch(() => {}),
            fs.unlink(tempMdPath).catch(() => {}),
            fs.unlink(tempTxtPath).catch(() => {})
          ]);
          console.log(`[saveBook] [Async] 临时文件清理完成: ${bookId}`);
        } catch (cleanupErr) {
          console.warn(`[saveBook] [Async] ⚠️ 清理临时文件时出现警告: ${bookId}`, cleanupErr);
        }
      } catch (err) {
        console.error(`[saveBook] [Async] ❌ 异步处理过程中出现严重错误: ${bookId}`, err);
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
