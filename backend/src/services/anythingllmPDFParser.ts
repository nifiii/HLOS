import fs from 'fs/promises';

/**
 * AnythingLLM PDF 解析服务
 * 使用 AnythingLLM 的原生 PDF 处理能力提取文本和元数据
 *
 * AnythingLLM 部署位置：http://127.0.0.1:3001
 * API 文档：https://docs.useanything.com/features/api
 */

const ANYTHINGLLM_API_URL = process.env.ANYTHINGLLM_API_URL || 'http://127.0.0.1:3001';
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;

/**
 * 使用 AnythingLLM 的 raw-text API 提取图书元数据
 * @param pdfTextContent PDF 的文本内容（通过 pdf-parse 提取）
 * @param fileName 文件名
 * @returns 提取的元数据
 */
export async function extractBookMetadataWithAnythingLLM(
  pdfTextContent: string,
  fileName: string
): Promise<{
  title: string;
  author: string;
  subject: string;
  grade: string;
  category: string;
  publisher: string;
  publishDate: string;
  confidence: number;
}> {
  try {
    console.log('========================================');
    console.log('使用 AnythingLLM 提取图书元数据');
    console.log('文件名:', fileName);
    console.log('文本长度:', pdfTextContent.length);
    console.log('AnythingLLM API:', ANYTHINGLLM_API_URL);
    console.log('========================================');

    if (!ANYTHINGLLM_API_KEY) {
      console.error('❌ ANYTHINGLLM_API_KEY 未配置');
      throw new Error('ANYTHINGLLM_API_KEY 未配置');
    }

    // 取前 3000 字符（约等于前 3-4 页）
    const firstPagesText = pdfTextContent.substring(0, 3000);

    console.log('前 3000 字符预览:', firstPagesText.substring(0, 200));

    // 构建提示词
    const prompt = `你是一个专业的图书元数据提取助手。请从以下教材 PDF 的前 4 页文本中，提取图书的基本信息。

【文件名】${fileName}

【前 4 页文本内容】
${firstPagesText}

请严格按照以下 JSON 格式返回元数据，不要添加任何其他文字说明：
{
  "title": "书名（如果在前4页找不到，使用文件名去除扩展名）",
  "author": "作者或编者（如果没有则为空字符串）",
  "subject": "学科（必须从以下选项选择：语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）",
  "grade": "年级（格式示例：一年级上册、二年级下册、高一上册、高三下册，如果无法确定则为空字符串）",
  "category": "类型（必须从以下选项选择：教科书、培训资料、工具书、课外读物，默认选择教科书）",
  "publisher": "出版社名称（如果没有则为空字符串）",
  "publishDate": "出版时间（格式：YYYY-MM，如果找不到则为空字符串，示例：2023-06、2022-01）",
  "confidence": 0.85
}

【提取规则】
1. **书名**：优先从封面或版权页提取，格式通常为"XXX教科书"或"XXX教材"
2. **学科**：根据书名和内容判断，必须是限定选项之一
3. **年级**：识别"X年级X学期"或"X年级X册"等格式
4. **类型**：教材类图书默认选择"教科书"
5. **出版社**：查找"出版社出版"或"出版社"等关键词
6. **出版时间**：查找"202X年X月"或"202X.X"格式，转换为 YYYY-MM
7. **置信度**：如果前4页信息充足，设置 0.8-1.0；信息缺失较多，设置 0.3-0.7

现在请提取并返回 JSON：`;

    console.log('调用 AnythingLLM 聊天 API...');

    // 使用 AnythingLLM 的 chat API
    const chatResponse = await fetch(`${ANYTHINGLLM_API_URL}/api/v1/workspace/default/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        mode: 'chat',
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ AnythingLLM API 错误:', errorText);
      throw new Error(`AnythingLLM API 错误: ${chatResponse.statusText} - ${errorText}`);
    }

    const chatData = await chatResponse.json();
    console.log('AnythingLLM 原始响应:', JSON.stringify(chatData).substring(0, 500));

    // 提取文本响应
    const responseText = chatData.textResponse || chatData.response || '';

    if (!responseText) {
      throw new Error('AnythingLLM 返回空响应');
    }

    console.log('响应文本长度:', responseText.length);

    // 解析 JSON 响应
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error('❌ 无法从响应中提取 JSON');
      console.error('响应内容:', responseText);
      throw new Error('无法从响应中提取 JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    console.log('========================================');
    console.log('✓ AnythingLLM 元数据提取成功');
    console.log('书名:', result.title);
    console.log('作者:', result.author);
    console.log('学科:', result.subject);
    console.log('年级:', result.grade);
    console.log('类型:', result.category);
    console.log('出版社:', result.publisher);
    console.log('出版时间:', result.publishDate);
    console.log('置信度:', result.confidence);
    console.log('========================================');

    return result;

  } catch (error) {
    console.error('========================================');
    console.error('❌ AnythingLLM 元数据提取失败');
    console.error('错误详情:', error);
    if (error instanceof Error) {
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    console.error('========================================');
    throw error;
  }
}
