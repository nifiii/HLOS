#!/usr/bin/env tsx
/**
 * POC: Gemini 2.0 Flash PDF 处理能力验证
 *
 * 测试目标：
 * 1. 验证 Gemini File API 是否能成功上传 PDF
 * 2. 验证 Gemini 是否能分析 PDF 内容并提取元数据
 * 3. 对比 PDF 内容分析 vs 文件名分析的准确度
 *
 * 运行方式：
 *   cd backend
 *   npx tsx pocs/gemini-pdf-poc.ts <path-to-test-pdf>
 */

import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname, resolve, normalize } from 'path';
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
  join(process.cwd(), '.env'),         // 当前工���目录
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = config({ path: envPath });
    if (result.error) {
      // 尝试下一个路径
      continue;
    }
    console.log(`✓ 已加载环境变量: ${envPath}`);
    envLoaded = true;
    break;
  } catch {
    // 忽略错误，尝试下一个路径
    continue;
  }
}

if (!envLoaded) {
  console.warn('⚠️  警告: 未能加载 .env 文件，将使用系统环境变量');
}

// ================================
// 测试数据
// ================================

const TEST_FILES = {
  // 可以在命令行参数指定测试文件
  custom: process.argv[2],

  // 或者使用示例文件
  examples: [
    '/d/devops/HL-os/test-data/sample-book.pdf',
    '/tmp/test-book.pdf',
  ]
};

// ================================
// 接口定义
// ================================

interface BookMetadata {
  title: string;
  author: string;
  subject: string;
  grade: string;
  category: string;
  publisher: string;
  publishDate: string;
}

interface FieldConfidence {
  title?: number;
  author?: number;
  subject?: number;
  grade?: number;
  category?: number;
  publisher?: number;
  publishDate?: number;
}

interface ExtractionResult {
  metadata: BookMetadata;
  confidence: {
    overall: number;
    fields: FieldConfidence;
  };
  source: 'filename' | 'pdf-content';
}

// ================================
// 核心功能
// ================================

/**
 * 方法 1: 基于 PDF 内容提取元数据（提取文本后用 Gemini 分析）
 */
async function extractFromPDFContent(
  pdfBuffer: Buffer,
  fileName: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in .env');
  }

  console.log('\n========================================');
  console.log('方法 1: PDF 内容分析（文本提取 + Gemini）');
  console.log('========================================');

  const genAI = new GoogleGenAI({ apiKey });

  try {
    // 步骤 1: 使用 pdfjs-dist 提取 PDF 前 3 页的文本
    console.log('步骤 1/2: 提取 PDF 前 3 页文本...');
    console.log('  文件名:', fileName);
    console.log('  文件大小:', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB');

    // 动态导入 pdfjs-dist
    const pkg = await import('pdfjs-dist');
    const { getDocument } = pkg;

    const uint8ArrayData = new Uint8Array(pdfBuffer);
    const loadingTask = getDocument({ data: uint8ArrayData });
    const pdfDocument = await loadingTask.promise;

    const totalPages = pdfDocument.numPages;
    const pagesToExtract = Math.min(3, totalPages);

    console.log('  PDF 总页数:', totalPages);
    console.log('  提取页数:', pagesToExtract);

    let extractedText = '';
    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      extractedText += `\n--- 第 ${i} 页 ---\n${pageText}\n`;
      console.log(`  ✓ 第 ${i} 页提取完成 (${pageText.length} 字符)`);
    }

    console.log('\n  总文本长度:', extractedText.length, '字符');
    console.log('  文本预览（前 200 字符）:');
    console.log('  ', extractedText.substring(0, 200).replace(/\n/g, ' '));

    // 步骤 2: 调用 Gemini 分析提取的文本
    console.log('\n步骤 2/2: 调用 Gemini 2.0 Flash 分析文本...');

    const prompt = `你是一个专业的图书元数据提取助手。请根据以下 PDF 文档的内容，提取图书的基本信息。

【PDF 前 3 页内容】
${extractedText}

请严格按照以下 JSON 格式返回元数据，不要添加任何其他文字说明（包括 markdown 代码块标记）：

{
  "title": "书名（从PDF内容中提取，去除版本说明等额外信息）",
  "author": "作者或编者（从PDF内容中提取，如果没有则为空字符串）",
  "subject": "学科（必须从以下选项选择：语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）",
  "grade": "年级（格式示例：一年级上册、二年级下册、高一上册、高三下册，如果无法确定则为空字符串）",
  "category": "类型（必须从以下选项选择：教科书、培训资料、工具书、课外读物，默认选择教科书）",
  "publisher": "出版社名称（从PDF内容中提取，如果没有则为空字符串）",
  "publishDate": "出版时间（格式：YYYY-MM、YYYY，如果找不到则为空字符串，示例：2023-06、2022）",
  "confidence": {
    "overall": 0.85,
    "fields": {
      "title": 0.9,
      "author": 0.5,
      "subject": 0.95,
      "grade": 0.8,
      "category": 0.9,
      "publisher": 0.3,
      "publishDate": 0.3
    }
  }
}

【推断规则】
1. **书名**：从PDF封面、版权页中提取完整名称
2. **学科**：根据PDF内容中的学科关键词判断，必须是限定选项之一
3. **年级**：识别"X年级X学期"、"X年级X册"、"X上/下册"等格式
4. **类型**：教材类图书默认选择"教科书"
5. **出版社**：从版权页提取出版社名称
6. **出版时间**：从版权页提取出版时间
7. **置信度**：
   - overall: 整体置信度（0-1），根据PDF内容清晰度判断
   - fields: 每个字段的置信度（0-1）
   - PDF中明确的信息设置 0.8-1.0
   - PDF中不明确或缺失的信息设置 0.0-0.4

请直接返回 JSON 对象，不要使用 markdown 代码块。`;

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
            category: {
              type: Type.STRING,
              enum: ['教科书', '培训资料', '工具书', '课外读物']
            },
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
                    category: { type: Type.NUMBER },
                    publisher: { type: Type.NUMBER },
                    publishDate: { type: Type.NUMBER }
                  }
                }
              }
            }
          },
          required: ['title', 'author', 'subject', 'grade', 'category', 'publisher', 'publishDate', 'confidence']
        }
      }
    });

    if (!response.text) {
      throw new Error('Gemini 返回空响应');
    }

    const parsed = JSON.parse(response.text);

    console.log('\n========================================');
    console.log('✓ PDF 内容分析成功');
    console.log('========================================');
    console.log('书名:', parsed.title);
    console.log('作者:', parsed.author || '(未识别)');
    console.log('学科:', parsed.subject);
    console.log('年级:', parsed.grade || '(未识别)');
    console.log('类型:', parsed.category);
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
        category: parsed.category || '教科书',
        publisher: parsed.publisher || '',
        publishDate: parsed.publishDate || ''
      },
      confidence: parsed.confidence || {
        overall: 0,
        fields: {}
      },
      source: 'pdf-content'
    };

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ PDF 内容分析失败');
    console.error('错误详情:', error);
    if (error instanceof Error) {
      console.error('错误消息:', error.message);
    }
    console.error('========================================');
    throw error;
  }
}

/**
 * 方法 2: 基于文件名提取元数据（现有方案）
 */
async function extractFromFileName(
  fileName: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured in .env');
  }

  console.log('\n========================================');
  console.log('方法 2: 文件名分析（现有方案）');
  console.log('========================================');

  const genAI = new GoogleGenAI({ apiKey });

  const prompt = `你是一个专业的图书元数据提取助手。请根据以下教材 PDF 文件名，推断图书的基本信息。

【文件名】${fileName}

请严格按照以下 JSON 格式返回元数据，不要添加任何其他文字说明（包括 markdown 代码块标记）：

{
  "title": "书名（根据文件名推断，去除版本说明等额外信息）",
  "author": "作者或编者（如果文件名中没有则为空字符串）",
  "subject": "学科（必须从以下选项选择：语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）",
  "grade": "年级（格式示例：一年级上册、二年级下册、高一上册、高三下册，如果无法确定则为空字符串）",
  "category": "类型（必须从以下选项选择：教科书、培训资料、工具书、课外读物，默认选择教科书）",
  "publisher": "出版社名称（如果文件名中没有则为空字符串）",
  "publishDate": "出版时间（格式：YYYY-MM、YYYY，如果找不到则为空字符串，示例：2023-06、2022）",
  "confidence": {
    "overall": 0.85,
    "fields": {
      "title": 0.9,
      "author": 0.5,
      "subject": 0.95,
      "grade": 0.8,
      "category": 0.9,
      "publisher": 0.3,
      "publishDate": 0.3
    }
  }
}

【推断规则】
1. **书名**：从文件名中提取核心名称，去除"义务教育教科书"、"根据课程标准修订"等修饰词
2. **学科**：根据文件名中的学科关键词判断，必须是限定选项之一
3. **年级**：识别"X年级X学期"、"X年级X册"、"X上/下册"等格式
4. **类型**：教材类图书默认选择"教科书"
5. **出版社**：如果文件名中没有则为空字符串
6. **出版时间**：如果文件名中没有则为空字符串
7. **置信度**：
   - overall: 整体置信度（0-1），根据文件名信息充足度判断
   - fields: 每个字段的置信度（0-1）
   - 文件名明确包含的字段（如学科、年级）设置 0.8-1.0
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
            category: {
              type: Type.STRING,
              enum: ['教科书', '培训资料', '工具书', '课外读物']
            },
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
                    category: { type: Type.NUMBER },
                    publisher: { type: Type.NUMBER },
                    publishDate: { type: Type.NUMBER }
                  }
                }
              }
            }
          },
          required: ['title', 'author', 'subject', 'grade', 'category', 'publisher', 'publishDate', 'confidence']
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
    console.log('学科:', parsed.subject);
    console.log('年级:', parsed.grade || '(未识别)');
    console.log('类型:', parsed.category);
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
        category: parsed.category || '教科书',
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
        category: '教科书',
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
  pdfResult: ExtractionResult,
  filenameResult: ExtractionResult
) {
  console.log('\n\n==================================================');
  console.log('对比分析');
  console.log('==================================================\n');

  const fields: (keyof BookMetadata)[] = ['title', 'author', 'subject', 'grade', 'category', 'publisher', 'publishDate'];

  console.log('字段'.padEnd(15), '|', 'PDF内容'.padEnd(30), '|', '文件名'.padEnd(30));
  console.log('-'.repeat(80));

  fields.forEach(field => {
    const pdfValue = pdfResult.metadata[field] || '(未识别)';
    const filenameValue = filenameResult.metadata[field] || '(未识别)';
    const pdfConfidence = (pdfResult.confidence.fields?.[field]?.toFixed(2)) || 'N/A';
    const filenameConfidence = (filenameResult.confidence.fields?.[field]?.toFixed(2)) || 'N/A';

    console.log(
      field.padEnd(15), '|',
      `${pdfValue} (${pdfConfidence})`.padEnd(30), '|',
      `${filenameValue} (${filenameConfidence})`.padEnd(30)
    );
  });

  console.log('\n整体置信度对比:');
  console.log('  PDF 内容分析:', pdfResult.confidence.overall);
  console.log('  文件名分析:  ', filenameResult.confidence.overall);

  console.log('\n推荐方案:');
  if (pdfResult.confidence.overall > filenameResult.confidence.overall) {
    console.log('  ✓ 使用 PDF 内容分析结果（置信度更高）');
  } else if (pdfResult.confidence.overall < filenameResult.confidence.overall) {
    console.log('  ✓ 使用文件名分析结果（置信度更高）');
  } else {
    console.log('  → 两种方法置信度相同，可以使用 PDF 内容结果（信息更全面）');
  }

  console.log('\n==================================================\n');
}

// ================================
// 主函数
// ================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Gemini 2.0 Flash PDF 处理能力验证 POC                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // 检查环境变量
  if (!process.env.GEMINI_API_KEY) {
    console.error('\n❌ 错误: GEMINI_API_KEY 未设置');
    console.error('请在 backend/.env 文件中配置 GEMINI_API_KEY');
    console.error('申请地址: https://aistudio.google.com/\n');
    process.exit(1);
  }

  // 获取测试文件路径
  let pdfPath = TEST_FILES.custom;
  if (!pdfPath) {
    console.error('\n❌ 错误: 未指定测试文件');
    console.error('\n使用方法:');
    console.error('  npx tsx pocs/gemini-pdf-poc.ts <path-to-pdf-file>\n');
    console.error('示例:');
    console.error('  npx tsx pocs/gemini-pdf-poc.ts /path/to/textbook.pdf\n');
    process.exit(1);
  }

  // 检查文件是否存在
  try {
    // 规范化路径，处理 Windows 路径
    const normalizedPath = normalize(pdfPath);
    console.log('\n测试文件:', normalizedPath);

    if (!existsSync(normalizedPath)) {
      console.error('\n❌ 错误: 文件不存��:', normalizedPath, '\n');
      process.exit(1);
    }

    const stats = statSync(normalizedPath);
    console.log('文件大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');

    // 更新 pdfPath 为规范化后的路径
    pdfPath = normalizedPath;
  } catch (error) {
    console.error('\n❌ 错误: 文件检查失败:', pdfPath, error, '\n');
    process.exit(1);
  }

  // 读取 PDF 文件
  console.log('\n正在读取 PDF 文件...');
  const pdfBuffer = readFileSync(pdfPath);
  const fileName = pdfPath.split('/').pop() || 'unknown.pdf';

  try {
    // 方法 1: PDF 内容分析
    const pdfResult = await extractFromPDFContent(pdfBuffer, fileName);

    // 等待一下，避免 API 速率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 方法 2: 文件名分析
    const filenameResult = await extractFromFileName(fileName);

    // 对比结果
    compareResults(pdfResult, filenameResult);

    console.log('✓ POC 测试完成');

  } catch (error) {
    console.error('\n❌ POC 测试失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);
