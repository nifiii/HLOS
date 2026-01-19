import pdfParse from 'pdf-parse';
import { ChapterNode } from '../types';

interface PDFParseResult {
  text: string;
  numpages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

export interface BookParseResult {
  content: string;
  pageCount: number;
  estimatedMetadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
  tableOfContents: ChapterNode[];
}

/**
 * 解析 PDF 文件
 * @param buffer PDF 文件的 Buffer
 * @returns 解析结果包含文本内容、页数、元数据
 */
export async function parsePDF(buffer: Buffer): Promise<BookParseResult> {
  try {
    const data: PDFParseResult = await pdfParse(buffer);

    // 提取 PDF 元数据
    const estimatedMetadata = {
      title: data.metadata.title,
      author: data.metadata.author,
      subject: data.metadata.subject,
    };

    // 从文本中提取章节目录
    const tableOfContents = extractTableOfContents(data.text);

    return {
      content: data.text,
      pageCount: data.numpages,
      estimatedMetadata,
      tableOfContents,
    };
  } catch (error) {
    console.error('PDF 解析失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    throw new Error(`PDF 解析失败: ${message}`);
  }
}

/**
 * 从文本中提取章节目录
 * 使用简单的正则匹配常见的章节标题格式
 */
function extractTableOfContents(text: string): ChapterNode[] {
  const chapters: ChapterNode[] = [];
  const lines = text.split('\n');

  // 常见章节标题格式：
  // 第一章 xxx
  // 第1章 xxx
  // Chapter 1: xxx
  // 1. xxx
  // 一、xxx
  const chapterRegex = /^(第[一二三四五六七八九十\d]+[章节课讲]|Chapter\s+\d+|第?\s*\d+[\.、\s]|[一二三四五六七八九十]+[、．])\s*(.+)$/;

  let currentChapterId = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(chapterRegex);

    if (match) {
      currentChapterId++;
      const title = match[2] || match[1];

      // 判断章节层级
      let level = 1;
      if (match[1].includes('节') || match[1].match(/^\d+\.\d+/)) {
        level = 2;
      }

      chapters.push({
        id: `chapter-${currentChapterId}`,
        title: title.trim(),
        level,
        children: [],
      });
    }
  }

  // 如果没有提取到章节，返回空数组（交由 Gemini AI 后续处理）
  return chapters;
}

/**
 * 生成 PDF 文本摘要（用于向量化）
 * @param fullText 完整文本
 * @param maxLength 最大长度（字符）
 */
export function generateSummary(fullText: string, maxLength: number = 3000): string {
  if (fullText.length <= maxLength) {
    return fullText;
  }

  // 分段截取：前1500字 + 后1500字
  const half = Math.floor(maxLength / 2);
  const start = fullText.substring(0, half);
  const end = fullText.substring(fullText.length - half);

  return `${start}\n\n[... 中间省略 ...]\n\n${end}`;
}
