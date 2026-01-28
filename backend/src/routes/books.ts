import { Router, Request, Response, NextFunction } from 'express';
import { queryMetadata, getMetadataById } from '../services/fileStorage.js';
import fs from 'fs/promises';

const router = Router();

/**
 * GET /api/books
 * 查询教材列表
 */
router.get('/books', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ownerId, subject, limit } = req.query;

    console.log(`[books] 查询条件:`, { ownerId, subject, limit });

    // 查询元数据（只查询教材类型）
    const metadataList = await queryMetadata({
      ownerId: ownerId as string,
      subject: subject as string,
      type: 'textbook', // 只返回教材
      limit: limit ? parseInt(limit as string) : undefined,
    });

    // 读取每个教材文件的基本信息
    const books = await Promise.all(
      metadataList.map(async (meta) => {
        let fileSize = 0;
        let pageCount = 0;

        // 尝试获取文件大小
        if (meta.filePath) {
          try {
            const stats = await fs.stat(meta.filePath);
            fileSize = stats.size;
          } catch (error) {
            console.error(`[books] 无法获取��件大小: ${meta.filePath}`);
          }
        }

        return {
          id: meta.id,
          ownerId: meta.ownerId,
          userName: meta.userName,
          uploadedAt: meta.timestamp,
          filePath: meta.filePath,
          fileSize,
          pageCount,
          subject: meta.subject,
          status: (meta as any).status || 'completed',
          // 元数据 (从数据库读取真实字段)
          metadata: {
            title: (meta as any).title || `${meta.subject}教材`,
            author: (meta as any).author,
            subject: meta.subject,
            category: (meta as any).category,
            grade: (meta as any).grade,
            publisher: (meta as any).publisher,
            publishDate: (meta as any).publishDate,
            tags: (meta as any).tags || [],
            coverImage: meta.imagePath,
          },
        };
      })
    );

    return res.json({
      success: true,
      data: books,
      count: books.length,
    });

  } catch (error: any) {
    console.error('[books] 错误:', error);
    next(error);
  }
});

/**
 * GET /api/books/:id
 * 获取单个教材详情
 */
router.get('/books/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    console.log(`[books] 获取详情: ${id}`);

    // 查询元数据
    const metadata = await getMetadataById(id);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: '教材不存在'
      });
    }

    // 获取文件信息
    let fileSize = 0;
    if (metadata.filePath) {
      try {
        const stats = await fs.stat(metadata.filePath);
        fileSize = stats.size;
      } catch (error) {
        console.error(`[books] 无法获取文件大小: ${metadata.filePath}`);
      }
    }

    // 返回完整数据
    const book = {
      id: metadata.id,
      ownerId: metadata.ownerId,
      userName: metadata.userName,
      uploadedAt: metadata.timestamp,
      filePath: metadata.filePath,
      fileSize,
      status: (metadata as any).status || 'completed',
      metadata: {
        title: (metadata as any).title || `${metadata.subject}教材`,
        author: (metadata as any).author,
        subject: metadata.subject,
        category: (metadata as any).category,
        grade: (metadata as any).grade,
        publisher: (metadata as any).publisher,
        publishDate: (metadata as any).publishDate,
        tags: (metadata as any).tags || [],
        coverImage: metadata.imagePath,
      },
    };

    return res.json({
      success: true,
      data: book,
    });

  } catch (error: any) {
    console.error('[books] 错误:', error);
    next(error);
  }
});

export default router;
