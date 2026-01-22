import fs from 'fs';
import { promises as fsPromises } from 'fs';
import FormData from 'form-data';

/**
 * AnythingLLM PDF 解析服务
 * 直接将 PDF 发送给 AnythingLLM 处理，不使用 Node.js 解析
 *
 * AnythingLLM 部署位置：http://127.0.0.1:3001
 * API 文档：https://docs.useanything.com/features/api
 */

const ANYTHINGLLM_API_URL = process.env.ANYTHINGLLM_API_URL || 'http://127.0.0.1:3001';
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;

// AnythingLLM 上传端点（注意：不是 /api/v1，而是 /v1）
const ANYTHINGLLM_UPLOAD_ENDPOINT = `${ANYTHINGLLM_API_URL}/v1/document/upload`;
const ANYTHINGLLM_CHAT_ENDPOINT = `${ANYTHINGLLM_API_URL}/v1/workspace/default/chat`;

/**
 * 使用 AnythingLLM 提取图书元数据
 * @param pdfFilePath PDF 文件的绝对路径
 * @param fileName 文件名
 * @returns 提取的元数据
 */
export async function extractBookMetadataWithAnythingLLM(
  pdfFilePath: string,
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
    console.log('使用 AnythingLLM 处理 PDF 并提取元数据');
    console.log('文件路径:', pdfFilePath);
    console.log('文件名:', fileName);
    console.log('AnythingLLM API:', ANYTHINGLLM_API_URL);
    console.log('========================================');

    if (!ANYTHINGLLM_API_KEY) {
      console.error('❌ ANYTHINGLLM_API_KEY 未配置');
      throw new Error('ANYTHINGLLM_API_KEY 未配置');
    }

    // 读取 PDF 文件内容
    console.log('读取 PDF 文件...');
    const fileBuffer = await fsPromises.readFile(pdfFilePath);
    console.log('✓ PDF 文件读取成功，大小:', fileBuffer.length, 'bytes');

    // 使用 FormData 直接发送文件
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/pdf',
    });

    console.log('开始上传 PDF 到 AnythingLLM...');

    // 上传 PDF 到 AnythingLLM
    const uploadResponse = await fetch(ANYTHINGLLM_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    console.log('上传响应状态:', uploadResponse.status, uploadResponse.statusText);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ AnythingLLM 上传失败:', uploadResponse.status, uploadResponse.statusText);
      console.error('响应内容:', errorText.substring(0, 500));
      throw new Error(`AnythingLLM 上传失败: ${uploadResponse.statusText} - ${errorText}`);
    }

    const contentType = uploadResponse.headers.get('content-type');
    console.log('响应 Content-Type:', contentType);

    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await uploadResponse.text();
      console.error('❌ AnythingLLM 返回非 JSON 响应');
      console.error('响应内容:', errorText.substring(0, 500));
      throw new Error(`AnythingLLM 返回非 JSON 响应: ${contentType}`);
    }

    const uploadData = await uploadResponse.json() as {
      success: boolean;
      document?: {
        id: string;
        title: string;
      };
    };

    console.log('✓ PDF 上传成功');
    console.log('文档 ID:', uploadData.document?.id);

    // 第二步：使用 AnythingLLM 聊天 API 提取元数据
    console.log('步骤 2/2: 调用 AnythingLLM 提取元数据...');

    const prompt = `你是一个专业的图书元数据提取助手。请从已上传的教材 PDF 文件"【${fileName}】"中，提取图书的基本信息。

请严格按照以下 JSON 格式返回元数据，不要添加任何其他文字说明：
{
  "title": "书名（如果找不到，使用文件名去除扩展名）",
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
7. **置信度**：如果信息充足，设置 0.8-1.0；信息缺失较多，设置 0.3-0.7

现在请从 PDF 文件中提取并返回 JSON：`;

    const chatResponse = await fetch(ANYTHINGLLM_CHAT_ENDPOINT, {
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
      console.error('❌ AnythingLLM 聊天失败:', errorText);
      throw new Error(`AnythingLLM 聊天失败: ${chatResponse.statusText} - ${errorText}`);
    }

    const chatData = await chatResponse.json() as {
      textResponse?: string;
      response?: string;
    };

    console.log('AnythingLLM 原始响应:', JSON.stringify(chatData).substring(0, 500));

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
