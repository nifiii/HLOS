import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

router.post('/generate-assessment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { request, contextItems, studentName } = req.body;

    if (!request || !contextItems || !studentName) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: request, contextItems, studentName'
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
      contents: `学生: ${studentName}, 科目: ${request.subject}\n基于错题上下文: ${contextItems.join('\n')}`,
      config: {
        systemInstruction: "你是一位资深命题专家。请基于学生的错题上下文，生成一份同类变式测试卷。",
        thinkingConfig: { thinkingBudget: 4096 }
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

export default router;
