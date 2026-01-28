import OpenAI from 'openai';
import { ChapterNode } from '../types.js';

// 初始化 OpenAI 客户端 (适配火山引擎)
const getDoubaoClient = () => {
  const apiKey = process.env.ARK_API_KEY;
  const model = process.env.ARK_MODEL_ID;

  if (!apiKey || !model) {
    throw new Error('缺少有效的 ARK_API_KEY 或 ARK_MODEL_ID 环境变量');
  }

  return {
    client: new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    }),
    model: model
  };
};

export interface DoubaoMetadataResult {
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
 * 使用豆包分析图书元数据
 */
export async function analyzeMetadataWithDoubao(
  text: string,
  fileName: string
): Promise<DoubaoMetadataResult> {
  try {
    const { client, model } = getDoubaoClient();

    // 截取前 8000 字作为样本（豆包支持长文本，可以适当多给一些）
    const contentSample = text.substring(0, 8000);

    const userPrompt = `文件名: ${fileName}\n\n图书内容片段:\n${contentSample}`;

    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      model: model,
      temperature: 0.1,
    });

    const rawContent = completion.choices[0].message.content || '{}';
    // 清理可能的 markdown 标记
    const cleanJson = rawContent.replace(/```json\n?|\n?```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Doubao 元数据分析失败:', error);
    throw error;
  }
}

/**
 * 使用豆包将 PDF 文本转换为 Markdown
 */
export async function convertToMarkdownWithDoubao(
  text: string
): Promise<string> {
  try {
    const { client, model } = getDoubaoClient();

    // 尝试处理更长的文本 (例如前 100,000 字符)，豆包部分模型支持长上下文
    // 如果 text 较短，则取全文
    const MAX_CHARS = 100000;
    const contentSample = text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;

    console.log(`[Doubao] 正在转换 Markdown, 文本长度: ${contentSample.length}`);

    const completion = await client.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: '你是一个专业的文档排版专家。请将用户提供的 PDF 提取文本重写为结构清晰、排版精美的 Markdown 格式。要求：\n1. 保留所有标题层级 (# ## ###)。\n2. 使用标准列表格式。\n3. 数学公式必须使用 LaTeX 格式 (例如 $...$ 或 $$...$$)。\n4. 保持原文逻辑，不要省略重要内容。\n5. 不要包含任何开场白或结束语，直接返回 Markdown 内容。' 
        },
        { role: 'user', content: contentSample }
      ],
      model: model,
      temperature: 0.1,
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('Doubao Markdown 转换失败:', error);
    throw error;
  }
}
