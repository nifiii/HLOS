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
      return res.status(400).json({
        success: false,
        error: '缺少必要参数 (metadata, tempFilePath)',
      });
    }

    // 解析 metadata
    const bookMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    const { title, subject, category, tags } = bookMetadata;
    const userName = USER_NAMES[ownerId] || '共享';

    console.log(`[saveBook] 开始保存教材: ${title} (${subject})`);

    // 1. 验证临时文件是否存在
    // 注意：tempFilePath 应该是绝对路径或相对于项目根目录的路径
    // 前端传递的可能是相对路径，需要处理
    const absoluteTempPath = path.isAbsolute(tempFilePath) 
      ? tempFilePath 
      : path.join(process.cwd(), tempFilePath.startsWith('/') ? tempFilePath.slice(1) : tempFilePath);

    try {
      await fs.access(absoluteTempPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: `临时文件不存在或已过期: ${tempFilePath}`,
      });
    }

    // 2. 移动并归档原始文件
    const fileBuffer = await fs.readFile(absoluteTempPath);
    const fileName = path.basename(absoluteTempPath);
    // 移除时间戳前缀（如果 tempFileName 有的话），或者保留，这里保留原样
    // 实际上 tempFileName 是 timestamp_originalName
    const savedFilePath = await saveBookFile(fileBuffer, fileName, ownerId, subject, userName);
    console.log(`[saveBook] 原始文件已归档: ${savedFilePath}`);

    // 3. 处理封面图片
    let finalCoverPath = null;
    let webCoverPath = null;
    let obsidianCoverPath = null;

    if (coverImage) {
      // 假设 coverImage 是 /uploads/covers/xxx.png 格式的相对路径
      const tempCoverPath = path.join(process.cwd(), coverImage.startsWith('/') ? coverImage.slice(1) : coverImage);
      try {
        await fs.access(tempCoverPath);
        
        const coverFileName = path.basename(tempCoverPath);
        // 使用 fileStorage 保存封面，返回文件名
        const savedFileName = await saveBookCover(tempCoverPath, coverFileName);
        console.log(`[saveBook] 封面已归档: ${savedFileName}`);

        // 构造路径
        finalCoverPath = savedFileName;
        // Web 访问路径 (需要在 index.ts 配置静态服务 /covers -> data/obsidian/covers)
        webCoverPath = `/covers/${savedFileName}`;
        // Obsidian 引用路径 (使用 Wiki Link 格式，Obsidian 会自动查找)
        obsidianCoverPath = `[[${savedFileName}]]`;

      } catch (err) {
        console.warn(`[saveBook] 封面图片处理失败: ${coverImage}`, err);
      }
    }

    // 4. 生成 Markdown 内容 (使用 Doubao)
    console.log('[saveBook] 开始生成 Markdown...');
    // 读取文本内容用于转换
    const { parsePDF } = await import('../services/pdfParser.js');
    const { parseEPUB } = await import('../services/epubParser.js');
    
    let contentText = '';
    const ext = path.extname(fileName).toLowerCase();
    
    console.log(`[saveBook] 解析文件内容 (格式: ${ext})...`);
    if (ext === '.pdf') {
      try {
        const result = await parsePDF(fileBuffer);
        contentText = result.content;
        console.log(`[saveBook] PDF 解析成功，内容长度: ${contentText.length}`);
      } catch (parseError) {
        console.error('[saveBook] PDF 解析失败:', parseError);
        throw new Error('PDF 解析失败，无法生成内容');
      }
    } else if (ext === '.epub') {
      const result = await parseEPUB(fileBuffer);
      contentText = JSON.stringify(result);
    } else {
      contentText = fileBuffer.toString('utf-8');
    }

    console.log('[saveBook] 调用 LLM 转换为 Markdown...');
    const markdownContent = await convertToMarkdown(contentText);
    console.log('[saveBook] Markdown 转换完成');

    // 5. 保存 Obsidian Markdown 文件
    // 更新 metadata 中的 coverImage 路径 (使用 Obsidian 格式)
    const metadataForSave = { ...bookMetadata, coverImage: obsidianCoverPath || '' };
    const mdFilePath = await saveBookMarkdown(metadataForSave, markdownContent, ownerId, userName);
    console.log(`[saveBook] Markdown 已保存: ${mdFilePath}`);

    // 6. 生成教材ID
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 7. 更新元数据索引 (books.json)
    await updateMetadataIndex({
      id: bookId,
      type: 'textbook',
      ownerId,
      userName,
      subject: subject || '综合',
      chapter: undefined,
      timestamp: Date.now(),
      filePath: savedFilePath,
      mdPath: mdFilePath,
      imagePath: webCoverPath || undefined, // 使用 Web 路径供前端显示
    });

    // 8. 推送到 AnythingLLM
    if (ANYTHINGLLM_API_KEY) {
      indexBookToAnythingLLM(
        bookId,
        ownerId,
        bookMetadata,
        contentText, // 使用纯文本索引
        savedFilePath
      ).catch(error => {
        console.error('[saveBook] AnythingLLM索引失败:', error);
      });
    }

    // 9. 清理临时文件
    try {
      await fs.unlink(absoluteTempPath);
      // 如果封面也是临时的，可以考虑清理，或者保留在 uploads/covers
    } catch (e) {
      console.warn('清理临时文件失败:', e);
    }

    return res.json({
      success: true,
      data: {
        id: bookId,
        title,
        filePath: savedFilePath,
        mdPath: mdFilePath
      },
    });

  } catch (error) {
    console.error('[saveBook] 错误:', error);
    const message = error instanceof Error ? error.message : '保存失败';
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
