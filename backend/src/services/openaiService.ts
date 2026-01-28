import OpenAI from 'openai';
import { ChapterNode } from '../types.js';

// 初始化 OpenAI 客户端
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_ID || 'gpt-4o';
  const baseURL = process.env.OPENAI_BASE_URL; // 可选，用于自定义代理地址

  if (!apiKey) {
    throw new Error('缺少有效的 OPENAI_API_KEY 环境变量');
  }

  return {
    client: new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    }),
    model: model
  };
};

export interface OpenAIMetadataResult {
  title: string;
  author?: string;
  subject: string;
  category: string;
  grade: string;
  tags: string[];
  publisher?: string;
  publishDate?: string;
  tableOfContents: ChapterNode[];
}

const SYSTEM_PROMPT = `你是一个专业的图书元数据分析专家。
你的任务是根据用户提供的图书内容片段，提取以下结构化元数据，并以纯 JSON 格式返回。

需要提取的字段：
1. **title**: 书名（通常在封面正中央，字体最大最醒目）
2. **author**: 作者（选填，若无法确定则留空）
3. **subject**: 学科分类（数学/物理/化学/生物/英语/语文/历史/地理/政治/其他）
4. **category**: 图书类型（教材/教辅/竞赛资料/考试真题/课外读物/其他）
5. **grade**: 年级段（格式如："七年级上册"、"高中一年级"、"小学三年级"等）
6. **tags**: 标签数组（如：["奥数", "几何", "代数"]，["中考", "真题"]等）
7. **publisher**: 出版社名称
8. **publishDate**: 出版日期（格式：YYYY-MM 或 YYYY）
9. **tableOfContents**: 章节目录扁平数组（包含 id, title, level 字段，level 1=章, 2=节）

请直接返回 JSON 对象，不要包含 markdown 代码块标记。`;

/**
 * 使用 OpenAI 分析图书元数据
 */
export async function analyzeMetadataWithOpenAI(
  text: string,
  fileName: string
): Promise<OpenAIMetadataResult> {
  try {
    const { client, model } = getOpenAIClient();

    // 截取前 15000 字作为样本 (GPT-4o 支持较大上下文)
    const contentSample = text.substring(0, 15000);

    const userPrompt = `文件名: ${fileName}\n\n图书内容片段:\n${contentSample}`;

    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      model: model,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content || '{}';
    return JSON.parse(rawContent);
  } catch (error) {
    console.error('OpenAI 元数据分析失败:', error);
    throw error;
  }
}

/**
 * 使用 OpenAI 将 PDF 文本转换为 Markdown
 */
export async function convertToMarkdownWithOpenAI(
  text: string
): Promise<string> {
  try {
    const { client, model } = getOpenAIClient();

    // MVP 版本限制字符数，生产环境建议分块处理
    const contentSample = text.substring(0, 50000); 

    const completion = await client.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: '你是一个文档排版专家。请将用户输入的文本重写为结构清晰、排版精美的 Markdown 格式。保留所有标题层级、列表、表格和数学公式（使用 LaTeX）。不要省略任何内容。' 
        },
        { role: 'user', content: contentSample }
      ],
      model: model,
      temperature: 0.1,
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('OpenAI Markdown 转换失败:', error);
    throw error;
  }
}
