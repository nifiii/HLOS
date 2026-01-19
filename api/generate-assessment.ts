import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 支持
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { request, contextItems, studentName } = req.body;

    if (!request || !contextItems || !studentName) {
      return res.status(400).json({
        error: '缺少必需参数: request, contextItems, studentName'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({ error: '服务器配置错误: API Key 未设置' });
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

    return res.status(200).json({
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
        error: "网络层解构失败：API 链路连接被重置或被防火墙拦截。"
      });
    }

    if (error.status === 403 || error.status === 401) {
      return res.status(403).json({
        error: "认证层解构失败：API Key 无效或额度不足。"
      });
    }

    return res.status(500).json({
      error: error.message || "服务器内部错误"
    });
  }
}
