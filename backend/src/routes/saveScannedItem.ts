import { Router, Request, Response, NextFunction } from 'express';
import {
  saveOriginalImage,
  saveObsidianMarkdown,
  updateMetadataIndex
} from '../services/fileStorage.js';

const router = Router();

// 用户名映射
const USER_NAMES: Record<string, string> = {
  'child_1': '大宝',
  'child_2': '二宝',
  'shared': '共享',
};

/**
 * POST /api/save-scanned-item
 * 保存扫描项到文件系统
 */
router.post('/save-scanned-item', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scannedItem, originalImageBase64 } = req.body;

    if (!scannedItem || !originalImageBase64) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: scannedItem, originalImageBase64'
      });
    }

    console.log(`[saveScannedItem] 开始保存扫描项: ${scannedItem.id}`);

    // 1. 保存原始图片
    const imagePath = await saveOriginalImage(originalImageBase64, scannedItem.ownerId);
    console.log(`[saveScannedItem] 原始图片已保存: ${imagePath}`);

    // 2. 保存 Obsidian Markdown
    const userName = USER_NAMES[scannedItem.ownerId] || '未知用户';
    const mdPath = await saveObsidianMarkdown(scannedItem, userName, imagePath);
    console.log(`[saveScannedItem] Markdown已保存: ${mdPath}`);

    // 3. 更新元数据索引
    await updateMetadataIndex({
      id: scannedItem.id,
      type: scannedItem.meta.type,
      ownerId: scannedItem.ownerId,
      userName,
      subject: scannedItem.meta.subject,
      chapter: scannedItem.meta.chapter_hint,
      timestamp: scannedItem.timestamp,
      mdPath,
      imagePath,
    });
    console.log(`[saveScannedItem] 元数据索引已更新`);

    return res.json({
      success: true,
      data: {
        mdPath,
        imagePath,
      }
    });

  } catch (error: any) {
    console.error('[saveScannedItem] 错误:', error);
    next(error);
  }
});

export default router;
