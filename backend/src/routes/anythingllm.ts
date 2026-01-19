import { Router, Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';

const router = Router();

const ANYTHINGLLM_BASE_URL = process.env.ANYTHINGLLM_ENDPOINT || 'http://localhost:3001';
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;

// 索引书籍到 AnythingLLM
router.post('/index-book', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookId, fileBase64, fileFormat, metadata } = req.body;

    if (!bookId || !fileBase64 || !fileFormat || !metadata) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: bookId, fileBase64, fileFormat, metadata'
      });
    }

    // TODO: 实现文档解析逻辑
    // 阶段2将实现 PDF/EPUB/TXT 解析
    let extractedText = '';
    let tableOfContents: any[] = [];

    // 临时占位符
    extractedText = `Book: ${metadata.title}\nFormat: ${fileFormat}\nProcessing...`;

    // 推送到 AnythingLLM
    const response = await fetch(`${ANYTHINGLLM_BASE_URL}/api/document/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        textContent: extractedText,
        metadata: {
          source: 'library',
          bookId: bookId,
          title: metadata.title,
          subject: metadata.subject,
          grade: metadata.grade,
          category: metadata.category,
          tags: metadata.tags
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AnythingLLM API error: ${response.statusText}`);
    }

    const result: any = await response.json();

    return res.json({
      success: true,
      data: {
        anythingLlmDocId: result.documentId || result.id,
        tableOfContents
      }
    });

  } catch (error: any) {
    console.error('AnythingLLM index-book error:', error);
    next(error);
  }
});

// 索引错题到 AnythingLLM
router.post('/index-scanned-item', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scannedItem } = req.body;

    if (!scannedItem) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: scannedItem'
      });
    }

    // 构造完整 Markdown（含 Frontmatter）
    const markdown = `---
type: ${scannedItem.meta.type}
subject: ${scannedItem.meta.subject}
chapter: ${scannedItem.meta.chapter_hint || ''}
knowledge_status: ${scannedItem.meta.knowledge_status}
owner: ${scannedItem.ownerId}
created: ${new Date(scannedItem.timestamp).toISOString()}
problems_count: ${scannedItem.meta.problems?.length || 0}
---

# ${scannedItem.meta.subject} - ${scannedItem.meta.chapter_hint || '综合'}

${scannedItem.rawMarkdown}

## 题目详情

${scannedItem.meta.problems?.map((p: any, idx: number) => `
### 题目 ${idx + 1}: ${p.questionNumber || `Q${idx + 1}`}

**原题内容：**
${p.content}

**学生作答：**
${p.studentAnswer || '未作答'}

**教师批改：**
${p.teacherComment || '无'}

**订正记录：**
${p.correction || '未订正'}

**状态：** ${p.status === 'wrong' ? '❌ 错误' : p.status === 'corrected' ? '✏️ 已订正' : '✅ 正确'}
`).join('\n')}
`;

    // 推送到 AnythingLLM
    const response = await fetch(`${ANYTHINGLLM_BASE_URL}/api/document/upload`, {
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
          subject: scannedItem.meta.subject,
          chapter: scannedItem.meta.chapter_hint,
          status: scannedItem.meta.knowledge_status,
          hasWrongProblems: scannedItem.meta.problems?.some((p: any) => p.status === 'wrong')
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AnythingLLM API error: ${response.statusText}`);
    }

    const result: any = await response.json();

    return res.json({
      success: true,
      data: {
        anythingLlmDocId: result.documentId || result.id
      }
    });

  } catch (error: any) {
    console.error('AnythingLLM index-scanned-item error:', error);
    next(error);
  }
});

// RAG 检索接口
router.post('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, filters } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: query'
      });
    }

    const response = await fetch(`${ANYTHINGLLM_BASE_URL}/api/workspace/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        mode: 'retrieve',  // 仅检索，不生成回答
        topK: 10,
        filters: filters || {}
      })
    });

    if (!response.ok) {
      throw new Error(`AnythingLLM API error: ${response.statusText}`);
    }

    const result: any = await response.json();

    return res.json({
      success: true,
      data: result.sources || []
    });

  } catch (error: any) {
    console.error('AnythingLLM search error:', error);
    next(error);
  }
});

export default router;
