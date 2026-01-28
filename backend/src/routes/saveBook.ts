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

    // 4. 处理 Markdown 文件 (使用 upload 阶段预生成的)
    console.log(`[saveBook] [4/5] 正在处理 Markdown 文件...`);
    let mdFilePath = null;
    const tempMdPath = absoluteTempPath.replace(path.extname(absoluteTempPath), '.md');
    
    try {
      await fs.access(tempMdPath);
      const markdownContent = await fs.readFile(tempMdPath, 'utf-8');
      const metadataForSave = { ...bookMetadata, coverImage: obsidianCoverPath || '' };
      mdFilePath = await saveBookMarkdown(metadataForSave, markdownContent, ownerId, userName);
      console.log(`[saveBook] ✓ Markdown 已归档: ${mdFilePath}`);
    } catch (err) {
      console.warn(`[saveBook] ⚠️ 预生成 Markdown 不存在或读取失败: ${tempMdPath}`);
    }

    // 5. 更新数据库记录
    console.log(`[saveBook] [5/5] 正在更新数据库记录...`);
    const finalEntry = {
      id: bookId,
      ...bookMetadata,
      ownerId,
      userName,
      timestamp: Date.now(),
      filePath: savedFilePath,
      mdPath: mdFilePath,
      imagePath: webCoverPath || undefined,
      status: 'completed'
    };
    await updateMetadataIndex(finalEntry);

    // 返回成功响应给前端
    res.json({
      success: true,
      data: {
        id: bookId,
        title,
        status: 'completed'
      },
    });

    // 6. 异步清理所有临时文件
    setImmediate(async () => {
      try {
        const tempTxtPath = absoluteTempPath.replace(path.extname(absoluteTempPath), '.txt');
        await Promise.all([
          fs.unlink(absoluteTempPath).catch(() => {}),
          fs.unlink(tempMdPath).catch(() => {}),
          fs.unlink(tempTxtPath).catch(() => {})
        ]);
        console.log(`[saveBook] [Async] 临时文件清理完成: ${bookId}`);
      } catch (err) {
        console.error(`[saveBook] [Async] ❌ 清理失败: ${bookId}`, err);
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
