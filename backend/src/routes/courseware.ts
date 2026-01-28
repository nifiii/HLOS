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
      model: 'gemini-3-flash-preview', // 使用 Flash 模型：速度更快，配额更大
      contents: `学生: ${studentName}, 教材: ${bookTitle}, 章节: ${chapter}\n基于以上信息生成 Markdown 格式的个性化课件。`,
      config: {
        systemInstruction: "你是一位资深学科专家。请根据学生的认知程度生成高质量 Markdown 课件。",
        temperature: 0.7
      }
    });

    return res.json({
      success: true,
      data: response.text || ""
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);

    // 处理 Gemini API 配额超限错误（429）
    if (error.status === 429 || error.code === 429) {
      return res.status(429).json({
        success: false,
        error: "API 配额已耗尽：Gemini API 调用频率或配额超限，请稍后重试或升级套餐。"
      });
    }

    // 处理网络连接错误
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

    // 处理认证错误
    if (error.status === 403 || error.status === 401) {
      return res.status(403).json({
        success: false,
        error: "认证层解构失败：API Key 无效或额度不足。"
      });
    }

    // 其他未知错误
    next(error);
  }
});

export default router;
