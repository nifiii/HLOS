import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

router.post('/generate-assessment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookTitle, subject, chapter, studentName, wrongProblems, coursewareContent } = req.body;

    if (!bookTitle || !subject || !chapter || !studentName) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: bookTitle, subject, chapter, studentName'
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

    // 构建错题上下文
    let wrongProblemsContext = '';
    if (wrongProblems && wrongProblems.length > 0) {
      wrongProblemsContext = '\n\n**学生历史错题记录：**\n' + wrongProblems
        .map((item: any, idx: number) => {
          const problems = item.meta?.problems || [];
          return problems
            .filter((p: any) => p.status === 'WRONG' || p.status === 'CORRECTED')
            .map((p: any) => `${idx + 1}. ${p.question || '(题目未识别)'}\n   学生答案: ${p.studentAnswer || '未作答'}\n   正确答案: ${p.correctAnswer || '未知'}\n   错因: ${p.teacherComment || '未标注'}`)
            .join('\n');
        })
        .filter((s: string) => s.length > 0)
        .join('\n\n');
    }

    // 构建课件上下文
    let coursewareContext = '';
    if (coursewareContent && coursewareContent.trim().length > 0) {
      coursewareContext = '\n\n**本章节课件内容摘要：**\n' + coursewareContent.substring(0, 1000);
    }

    const prompt = `学生姓名: ${studentName}
教材: 《${bookTitle}》
科目: ${subject}
章节: ${chapter}${wrongProblemsContext}${coursewareContext}

请基于以上信息，生成一份配套测验卷（Markdown 格式），要求：
1. 题目数量：每个核心知识点 2 道基础题 + 1 道提高题
2. 如果有历史错题，重点针对这些薄弱环节出变式题
3. 题目难度：70% 基础题，30% 提高题
4. 包含详细答案和解析
5. 使用 Markdown 格式，结构清晰`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // 使用 Flash 模型：速度更快，配额更大
      contents: prompt,
      config: {
        systemInstruction: "你是一位资深命题专家。请根据学生的学习情况生成高质量配套测验卷。题目要有针对性、难度适中、知识点覆盖全面。",
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
