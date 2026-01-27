#!/usr/bin/env tsx
/**
 * POC: Gemini 2.0 Flash 封面识别提取图书元数据
 *
 * 测试目标：
 * 1. 验证 Gemini File API 是否能成功上传 PDF
 * 2. 验证 Gemini 2.0 Flash 能否通过封面识别提取元数据
 * 3. 对比封面识别 vs 文件名分析的准确度
 *
 * 运行方式：
 *   cd backend
 *   npx tsx pocs/gemini-cover-poc.ts <path-to-test-pdf>
 */

import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, normalize } from 'path';
import { fileURLToPath } from 'url';

// 加载环境变量（尝试多个可能的 .env 位置）
import { config } from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 尝试从多个位置加载 .env
const envPaths = [
  join(__dirname, '../../.env'),      // 项目根目录 (backend/../.env)
  join(__dirname, '../.env'),          // backend 目录
  '/opt/hl-os/.env',                   // 生产环境默认位置
  join(process.cwd(), '.env'),         // 当前工作目录
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = config({ path: envPath });
    if (result.error) {
      continue;
    }
    console.log(`✓ 已加载环境变量: ${envPath}`);
    envLoaded = true;
    break;
  } catch {
    continue;
  }
}

if (!envLoaded) {
  console.warn('⚠️  警告: 未能加载 .env 文件，将使用系统环境变量');
}

// ================================
// 接口定义
// ================================

interface BookMetadata {
  title: string;
  author: string;
  subject: string;
  grade: string;
  publisher: string;
  publishDate: string;
}

interface FieldConfidence {
  title?: number;
  author?: number;
  subject?: number;
  grade?: number;
  publisher?: number;
  publishDate?: number;
}

interface ExtractionResult {
  metadata: BookMetadata;
  confidence: {
    overall: number;
    fields: FieldConfidence;
  };
  source: 'cover' | 'filename';
}

// ================================
// 核心功能
// ================================

/**
 * 方法 1: 基于 PDF 封面识别提取元数据（使用 Gemini File API）
 */
async function extractFromPDFCover(
  pdfBuffer: Buffer,
  fileName: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in .env');
  }

  console.log('\n========================================');
  console.log('方法 1: PDF 封面识别（Gemini File API）');
  console.log('========================================');

  try {
    // 步骤 1: 上传 PDF 到 Gemini File API（使用原生 multipart/form-data）
    console.log('\n步骤 1/2: 上传 PDF 到 Gemini File API...');
    console.log('  文件名:', fileName);
    console.log('  文件大小:', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB');

    // 使用 FormData 上传（绕过 SDK 的 upload 方法）
    const formData = new FormData();
    // @ts-ignore - Buffer to Blob conversion
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName);

    // 使用 AbortController 增加超时时间（60秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const uploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      { method: 'POST', body: formData, signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`上传失败: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileUri = uploadResult.file.uri;

    console.log('  ✓ PDF 上传成功');
    console.log('  File URI:', fileUri);
    console.log('  File Name:', uploadResult.file.name);

    // 步骤 2: 使用 SDK 调用 Gemini 2.0 Flash 分析封面
    console.log('\n步骤 2/2: 调用 Gemini 2.0 Flash 分析封面...');

    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `你是一个专业的图书元数据提取助手。请仔细分析这个 PDF 文件的封面（第 1 页），提取图书的基本信息。

【提取重点】
1. **书名**：通常在封面正中央，字体最大最醒目
2. **科目**：从书名或封面标签识别（必须是限定选项之一）
3. **年级**：识别"X年级X学期"、"X年级X册"、"X上/下册"等格式
4. **作者/编者**：通常在封面下方或版权页
5. **出版社**：封面下方或版权页的出版社名称
6. **出版日期**：版权页的出版时间（转换为 YYYY-MM 或 YYYY 格式）

【置信度评分标准】
- 0.8-1.0: 封面明确可见、无歧义的信息
- 0.5-0.7: 封面可见但需要一定推断的信息
- 0.0-0.4: 封面缺失、模糊或无法识别的信息

请严格按照以下 JSON 格式返回，不要添加任何其他文字说明（包括 markdown 代码块标记）：
{
  "title": "书名",
  "author": "作者或编者",
  "subject": "科目（语文/数学/英语/物理/化学/生物/历史/地理/政治/其他）",
  "grade": "年级（如：一年级上册、高二下册）",
  "publisher": "出版社名称",
  "publishDate": "出版时间（YYYY-MM 或 YYYY）",
  "confidence": {
    "overall": 0.85,
    "fields": {
      "title": 0.9,
      "author": 0.7,
      "subject": 0.95,
      "grade": 0.85,
      "publisher": 0.6,
      "publishDate": 0.5
    }
  }
}`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { fileData: { fileUri: fileUri, mimeType: 'application/pdf' } }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            subject: {
              type: Type.STRING,
              enum: ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '其他']
            },
            grade: { type: Type.STRING },
            publisher: { type: Type.STRING },
            publishDate: { type: Type.STRING },
            confidence: {
              type: Type.OBJECT,
              properties: {
                overall: { type: Type.NUMBER },
                fields: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.NUMBER },
                    author: { type: Type.NUMBER },
                    subject: { type: Type.NUMBER },
                    grade: { type: Type.NUMBER },
                    publisher: { type: Type.NUMBER },
                    publishDate: { type: Type.NUMBER }
                  }
                }
              }
            }
          },
          required: ['title', 'author', 'subject', 'grade', 'publisher', 'publishDate', 'confidence']
        }
      }
    });

    if (!response.text) {
      throw new Error('Gemini 返回空响应');
    }

    const parsed = JSON.parse(response.text);

    console.log('\n========================================');
    console.log('✓ 封面分析成功');
    console.log('========================================');
    console.log('书名:', parsed.title);
    console.log('作者:', parsed.author || '(未识别)');
    console.log('科目:', parsed.subject);
    console.log('年级:', parsed.grade || '(未识别)');
    console.log('出版社:', parsed.publisher || '(未识别)');
    console.log('出版时间:', parsed.publishDate || '(未识别)');
    console.log('整体置信度:', parsed.confidence?.overall);

    if (parsed.confidence?.fields) {
      console.log('\n字段级置信度:');
      const fields = ['title', 'author', 'subject', 'grade', 'publisher', 'publishDate'];
      const fieldNames = { title: '书名', author: '作者', subject: '科目', grade: '年级', publisher: '出版社', publishDate: '出版时间' };
      fields.forEach(field => {
        const conf = parsed.confidence.fields[field];
        if (conf !== undefined) {
          console.log(`  ${fieldNames[field]}: ${conf}`);
        }
      });
    }
    console.log('========================================');

    return {
      metadata: {
        title: parsed.title || '',
        author: parsed.author || '',
        subject: parsed.subject || '其他',
        grade: parsed.grade || '',
        publisher: parsed.publisher || '',
        publishDate: parsed.publishDate || ''
      },
      confidence: parsed.confidence || {
        overall: 0,
        fields: {}
      },
      source: 'cover'
    };

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ 封面分析失败');
    console.error('错误详情:', error);
    if (error instanceof Error) {
      console.error('错误消息:', error.message);
    }
    console.error('========================================');
    throw error;
  }
}

/**
 * 方法 2: 基于文件名提取元数据（降级方案）
 */
async function extractFromFileName(
  fileName: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in .env');
  }

  console.log('\n========================================');
  console.log('方法 2: 文件名分析（降级方案）');
  console.log('========================================');

  const genAI = new GoogleGenAI({ apiKey });

  const prompt = `你是一个专业的图书元数据提取助手。请根据以下教材 PDF 文件名，推断图书的基本信息。

【文件名】${fileName}

请严格按照以下 JSON 格式返回元数据，不要添加任何其他文字说明（包括 markdown 代码块标记）：

{
  "title": "书名（根据文件名推断，去除版本说明等额外信息）",
  "author": "作者或编者（如果文件名中没有则为空字符串）",
  "subject": "科目（必须从以下选项选择：语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）",
  "grade": "年级（格式示例：一年级上册、二年级下册、高一上册、高三下册，如果无法确定则为空字符串）",
  "publisher": "出版社名称（如果文件名中没有则为空字符串）",
  "publishDate": "出版时间（格式：YYYY-MM、YYYY，如果找不到则为空字符串，示例：2023-06、2022）",
  "confidence": {
    "overall": 0.85,
    "fields": {
      "title": 0.9,
      "author": 0.5,
      "subject": 0.95,
      "grade": 0.8,
      "publisher": 0.3,
      "publishDate": 0.3
    }
  }
}

【推断规则】
1. **书名**：从文件��中提取核心名称，去除"义务教育教科书"、"根据课程标准修订"等修饰词
2. **科目**：根据文件名中的科目关键词判断，必须是限定选项之一
3. **年级**：识别"X年级X学期"、"X年级X册"、"X上/下册"等格式
4. **出版社**：如果文件名中没有则为空字符串
5. **出版时间**：如果文件名中没有则为空字符串
6. **置信度**：
   - overall: 整体置信度（0-1），根据文件名信息充足度判断
   - fields: 每个字段的置信度（0-1）
   - 文件名明确包含的字段（如科目、年级）设置 0.8-1.0
   - 文件名不包含的字段（如作者、出版社）设置 0.0-0.4

请直接返回 JSON 对象，不要使用 markdown 代码块。`;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            subject: {
              type: Type.STRING,
              enum: ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '其他']
            },
            grade: { type: Type.STRING },
            publisher: { type: Type.STRING },
            publishDate: { type: Type.STRING },
            confidence: {
              type: Type.OBJECT,
              properties: {
                overall: { type: Type.NUMBER },
                fields: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.NUMBER },
                    author: { type: Type.NUMBER },
                    subject: { type: Type.NUMBER },
                    grade: { type: Type.NUMBER },
                    publisher: { type: Type.NUMBER },
                    publishDate: { type: Type.NUMBER }
                  }
                }
              }
            }
          },
          required: ['title', 'author', 'subject', 'grade', 'publisher', 'publishDate', 'confidence']
        }
      }
    });

    if (!response.text) {
      throw new Error('Gemini 返回空响应');
    }

    const parsed = JSON.parse(response.text);

    console.log('========================================');
    console.log('✓ 文件名分析成功');
    console.log('========================================');
    console.log('书名:', parsed.title);
    console.log('作者:', parsed.author || '(未识别)');
    console.log('科目:', parsed.subject);
    console.log('年级:', parsed.grade || '(未识别)');
    console.log('出版社:', parsed.publisher || '(未识别)');
    console.log('出版时间:', parsed.publishDate || '(未识别)');
    console.log('整体置信度:', parsed.confidence?.overall);
    console.log('========================================');

    return {
      metadata: {
        title: parsed.title || '',
        author: parsed.author || '',
        subject: parsed.subject || '其他',
        grade: parsed.grade || '',
        publisher: parsed.publisher || '',
        publishDate: parsed.publishDate || ''
      },
      confidence: parsed.confidence || {
        overall: 0,
        fields: {}
      },
      source: 'filename'
    };

  } catch (error) {
    console.error('========================================');
    console.error('❌ 文件名分析失败');
    console.error('错误详情:', error);
    if (error instanceof Error) {
      console.error('错误消息:', error.message);
    }
    console.error('========================================');

    // 降级处理
    const fallbackTitle = fileName.replace(/\.(pdf|epub|txt)$/i, '');
    return {
      metadata: {
        title: fallbackTitle,
        author: '',
        subject: '其他',
        grade: '',
        publisher: '',
        publishDate: ''
      },
      confidence: {
        overall: 0.0,
        fields: {}
      },
      source: 'filename'
    };
  }
}

/**
 * 对比两种方法的结果
 */
function compareResults(
  coverResult: ExtractionResult,
  filenameResult: ExtractionResult
) {
  console.log('\n\n==================================================');
  console.log('对比分析');
  console.log('==================================================\n');

  const fields: (keyof BookMetadata)[] = ['title', 'author', 'subject', 'grade', 'publisher', 'publishDate'];
  const fieldNames: Record<keyof BookMetadata, string> = {
    title: '书名',
    author: '作者',
    subject: '科目',
    grade: '年级',
    publisher: '出版社',
    publishDate: '出版时间'
  };

  console.log(fieldNames.title.padEnd(12, ' '), '|', '封面识别'.padEnd(35), '|', '文件名'.padEnd(35));
  console.log('-'.repeat(88));

  fields.forEach(field => {
    const coverValue = coverResult.metadata[field] || '(未识别)';
    const filenameValue = filenameResult.metadata[field] || '(未识别)';
    const coverConfidence = (coverResult.confidence.fields?.[field as keyof FieldConfidence]?.toFixed(2)) || 'N/A';
    const filenameConfidence = (filenameResult.confidence.fields?.[field as keyof FieldConfidence]?.toFixed(2)) || 'N/A';

    console.log(
      fieldNames[field].padEnd(12, ' '), '|',
      `${coverValue} (${coverConfidence})`.padEnd(35), '|',
      `${filenameValue} (${filenameConfidence})`.padEnd(35)
    );
  });

  console.log('\n整体置信度对比:');
  console.log('  封面识别:', coverResult.confidence.overall);
  console.log('  文件名:  ', filenameResult.confidence.overall);

  console.log('\n推荐方案:');
  if (coverResult.confidence.overall > filenameResult.confidence.overall) {
    console.log('  ✓ 使用封面识别结果（置信度更高）');
  } else if (coverResult.confidence.overall < filenameResult.confidence.overall) {
    console.log('  ✓ 使用文件名分析结果（置信度更高）');
  } else {
    console.log('  → 两种方法置信度相同，可以使用封面识别结果（信息更全面）');
  }

  console.log('\n==================================================\n');
}

// ================================
// 主函数
// ================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Gemini 2.0 Flash 封面识别提取元数据 POC              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // 检查环境变量
  if (!process.env.GEMINI_API_KEY) {
    console.error('\n❌ 错误: GEMINI_API_KEY 未设置');
    console.error('请在 backend/.env 文件中配置 GEMINI_API_KEY');
    console.error('申请地址: https://aistudio.google.com/\n');
    process.exit(1);
  }

  // 获取测试文件路径
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('\n❌ 错误: 未指定测试文件');
    console.error('\n使用方法:');
    console.error('  npx tsx pocs/gemini-cover-poc.ts <path-to-pdf-file>\n');
    console.error('示例:');
    console.error('  npx tsx pocs/gemini-cover-poc.ts d:/devops/HL-os/tmp/poc-test-1769158206241.pdf\n');
    process.exit(1);
  }

  // 检查文件是否存在
  const normalizedPath = normalize(pdfPath);
  console.log('\n测试文件:', normalizedPath);

  if (!existsSync(normalizedPath)) {
    console.error('\n❌ 错误: 文件不存在:', normalizedPath, '\n');
    process.exit(1);
  }

  const stats = statSync(normalizedPath);
  console.log('文件大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');

  // 读取 PDF 文件
  console.log('\n正在读取 PDF 文件...');
  const pdfBuffer = readFileSync(normalizedPath);
  const fileName = normalizedPath.split(/[/\\]/).pop() || 'unknown.pdf';

  try {
    // 方法 1: 封面识别
    const coverResult = await extractFromPDFCover(pdfBuffer, fileName);

    // 等待一下，避免 API 速率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 方法 2: 文件名分析（对比）
    const filenameResult = await extractFromFileName(fileName);

    // 对比结果
    compareResults(coverResult, filenameResult);

    console.log('✓ POC 测试完成');

  } catch (error) {
    console.error('\n❌ POC 测试失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);
