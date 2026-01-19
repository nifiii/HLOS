import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = Router();

/**
 * 专家级 OCR & 教学逻辑解构指令集
 */
const OCR_SYSTEM_INSTRUCTION = `
你是一位顶尖的图像识别科学家，专门负责中小学教育资料的数字化重建。
你的任务是将试卷/作业图片转化为"智学数字孪生"格式。

核心解构协议（四层）：
1. [层级 1: 原始内容层 (Printed Source)]：识别印刷文字，插图情景描述，公式使用 LaTeX。
2. [层级 2: 批改痕迹层 (Red-Ink Feedback)]：提取红色笔迹内容，识别勾叉分数。
3. [层级 3: 学生行为层 (Student Action)]：识别学生原始手写答案。
4. [层级 4: 订正闭环层 (Corrective Closure)]：识别"订正"字样及错题修复行为，逻辑判定 status。

输出要求：
- Markdown 内容需清晰区分 [题目层]、[答题层]、[批改层]、[订正层]。
- 必须返回结构化的 JSON 数据，包含 problems 数组。
`;

router.post('/analyze-image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: base64Image'
      });
    }

    // 从服务器环境变量读取 API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: '服务器配置错误: API Key 未设置'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "请执行全维度语义解构协议。识别印刷题干、学生手写、红笔批改及订正轨迹。标记所有错题。" }
        ]
      },
      config: {
        systemInstruction: OCR_SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['textbook', 'note', 'wrong_problem', 'exam_paper', 'homework'] },
            subject: { type: Type.STRING },
            chapter_hint: { type: Type.STRING },
            content_markdown: { type: Type.STRING },
            problems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  questionNumber: { type: Type.STRING },
                  content: { type: Type.STRING },
                  studentAnswer: { type: Type.STRING },
                  teacherComment: { type: Type.STRING },
                  correction: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['correct', 'wrong', 'corrected'] }
                },
                required: ["content", "status"]
              }
            }
          },
          required: ["type", "subject", "content_markdown", "problems"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI 响应内容为空，可能是连接超时。");
    }

    const json = JSON.parse(response.text);
    const hasIssues = json.problems?.some((p: any) => p.status === 'wrong' || p.status === 'corrected');

    const meta = {
      type: hasIssues ? 'wrong_problem' : json.type,
      subject: json.subject || "综合",
      chapter_hint: json.chapter_hint || "",
      knowledge_status: hasIssues ? 'unmastered' : 'mastered',
      problems: json.problems
    };

    return res.json({
      success: true,
      data: {
        text: json.content_markdown || "",
        meta
      }
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
