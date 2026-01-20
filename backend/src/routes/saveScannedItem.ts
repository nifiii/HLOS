import { Router, Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import {
  saveOriginalImage,
  saveObsidianMarkdown,
  updateMetadataIndex
} from '../services/fileStorage.js';

const router = Router();

const ANYTHINGLLM_BASE_URL = process.env.ANYTHINGLLM_ENDPOINT || 'http://localhost:3001';
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;

// 用户名映射
const USER_NAMES: Record<string, string> = {
  'child_1': '大宝',
  'child_2': '二宝',
  'shared': '共享',
};

/**
 * POST /api/save-scanned-item
 * 保存扫描项到文件系统并索引到 AnythingLLM
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

    // 4. 推送到 AnythingLLM（异步，不阻塞响应）
    if (ANYTHINGLLM_API_KEY) {
      indexToAnythingLLM(scannedItem, mdPath, imagePath).catch(error => {
        console.error('[saveScannedItem] AnythingLLM索引失败:', error);
      });
    }

    return res.json({
      success: true,
      data: {
        mdPath,
        imagePath,
        anythingLlmDocId: null, // 稍后异步更新
      }
    });

  } catch (error: any) {
    console.error('[saveScannedItem] 错误:', error);
    next(error);
  }
});

/**
 * 异步索引到 AnythingLLM
 */
async function indexToAnythingLLM(
  scannedItem: any,
  mdPath: string,
  imagePath: string
): Promise<void> {
  try {
    // 构造完整 Markdown（含 Frontmatter）
    const markdown = `---
type: ${scannedItem.meta.type}
subject: ${scannedItem.meta.subject}
chapter: ${scannedItem.meta.chapter_hint || ''}
knowledge_status: ${scannedItem.meta.knowledge_status}
owner: ${scannedItem.ownerId}
created: ${new Date(scannedItem.timestamp).toISOString()}
mdPath: ${mdPath}
imagePath: ${imagePath}
problems_count: ${scannedItem.meta.problems?.length || 0}
---

# ${scannedItem.meta.subject} - ${scannedItem.meta.chapter_hint || '综合'}

${scannedItem.rawMarkdown}

## 题目详情

${scannedItem.meta.problems?.map((p: any, idx: number) => `
### 题目 ${idx + 1}

**原题：** ${p.content}
**学生答案：** ${p.studentAnswer || '未作答'}
**批改：** ${p.teacherComment || '无'}
**状态：** ${p.status}
`).join('\n')}
`;

    const response = await fetch(`${ANYTHINGLLM_BASE_URL}/api/v1/document/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        textContent: markdown,
        metadata: {
          source: 'scanned_item',
          itemId: scannedItem.id,
          ownerId: scannedItem.ownerId,
          subject: scannedItem.meta.subject,
          chapter: scannedItem.meta.chapter_hint,
          type: scannedItem.meta.type,
          status: scannedItem.meta.knowledge_status,
          mdPath,
          imagePath,
          hasWrongProblems: scannedItem.meta.problems?.some((p: any) => p.status === 'WRONG')
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AnythingLLM API error: ${response.statusText}`);
    }

    const result: any = await response.json();
    console.log(`[indexToAnythingLLM] 索引成功: ${result.documentId || result.id}`);

    // 更新元数据索引（添加 anythingLlmDocId）
    await updateMetadataIndex({
      id: scannedItem.id,
      type: scannedItem.meta.type,
      ownerId: scannedItem.ownerId,
      userName: USER_NAMES[scannedItem.ownerId] || '未知',
      subject: scannedItem.meta.subject,
      chapter: scannedItem.meta.chapter_hint,
      timestamp: scannedItem.timestamp,
      mdPath,
      imagePath,
      anythingLlmDocId: result.documentId || result.id,
    });

  } catch (error) {
    console.error('[indexToAnythingLLM] 失败:', error);
    throw error;
  }
}

export default router;
