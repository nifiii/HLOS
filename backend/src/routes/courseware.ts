import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// 原有的课件生成接口（保留向后兼容）
router.post('/generate-courseware', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookTitle, chapter, studentName } = req.body;

    if (!bookTitle || !chapter || !studentName) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: bookTitle, chapter, studentName'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: '服务器配置错误: API Key 未设置'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `学生: ${studentName}, 教材: ${bookTitle}, 章节: ${chapter}\n基于以上信息生成 Markdown 格式的个性化课件。`,
      config: {
        systemInstruction: "你是一位资深学科专家。请根据学生的认知程度生成高质量 Markdown 课件。",
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    return res.json({
      success: true,
      data: response.text || ""
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);

    const msg = (error.message || "").toLowerCase();
    if (
      msg.includes("fetch") ||
      msg.includes("networkerror") ||
      msg.includes("failed to fetch") ||
      msg.includes("closed") ||
      msg.includes("reset") ||
      msg.includes("connection")
    ) {
      return res.status(503).json({
        success: false,
        error: "网络层解构失败：API 链路连接被重置或被防火墙拦截。"
      });
    }

    if (error.status === 403 || error.status === 401) {
      return res.status(403).json({
        success: false,
        error: "认证层解构失败：API Key 无效或额度不足。"
      });
    }

    next(error);
  }
});

// TODO: 新版课件生成接口（整合 AnythingLLM）
// POST /api/generate-courseware-v2
// 将在阶段3实现

export default router;
