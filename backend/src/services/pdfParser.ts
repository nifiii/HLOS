import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { ChapterNode } from '../types';

// 配置 PDF.js worker
// 在 Node 环境下使用 standard worker
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js';

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
 * 轻量级 PDF 元数据提取（只读取元数据，不解析文本内容）
 * @param buffer PDF 文件的 Buffer
 * @returns 解析结果包含页数、元数据
 */
export async function extractPDFMetadata(buffer: Buffer): Promise<{
  pageCount: number;
  estimatedMetadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
}> {
  try {
    const uint8ArrayData = new Uint8Array(buffer);
    const loadingTask = getDocument({
      data: uint8ArrayData,
      useSystemFonts: true,
      disableFontFace: true,
    });
    
    const pdfDocument = await loadingTask.promise;
    const metadata = await pdfDocument.getMetadata().catch(() => ({ info: {} }));
    const info = (metadata.info as any) || {};

    return {
      pageCount: pdfDocument.numPages,
      estimatedMetadata: {
        title: info.Title || info.title,
        author: info.Author || info.author,
        subject: info.Subject || info.subject,
      },
    };
  } catch (error) {
    console.error('PDF 元数据提取失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    throw new Error(`PDF 元数据提取失败: ${message}`);
  }
}

/**
 * 解析 PDF 文件（完整解析，包含文本内容）
 * @param buffer PDF 文件的 Buffer
 * @returns 解析结果包含文本内容、页数、元数据
 */
export async function parsePDF(buffer: Buffer): Promise<BookParseResult> {
  try {
    const uint8ArrayData = new Uint8Array(buffer);
    const loadingTask = getDocument({
      data: uint8ArrayData,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    const fullTextParts: string[] = [];

    // 并行提取每一页的文本（为了性能，可以分批处理）
    // 这里简单实现串行提取，确保顺序正确
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        // 拼接页面文本
        // 简单策略：将所有 item.str 用空格连接，或者根据坐标判断换行
        // 这里使用简单的拼接，每页之间加换行
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' '); // 单词间空格
          
        // 过滤空白页
        if (pageText.trim().length > 0) {
          fullTextParts.push(pageText);
        }
      } catch (pageError) {
        console.warn(`第 ${i} 页解析失败，跳过:`, pageError);
      }
    }

    const fullText = fullTextParts.join('\n\n'); // 页间换行

    // 提取元数据
    const metadata = await pdfDocument.getMetadata().catch(() => ({ info: {} }));
    const info = (metadata.info as any) || {};
    
    const estimatedMetadata = {
      title: info.Title || info.title,
      author: info.Author || info.author,
      subject: info.Subject || info.subject,
    };

    // 从文本中提取章节目录
    const tableOfContents = extractTableOfContents(fullText);

    return {
      content: fullText,
      pageCount: numPages,
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
    // 限制标题长度，避免误判长段落
    if (line.length > 50) continue;

    const match = line.match(chapterRegex);

    if (match) {
      currentChapterId++;
      // 安全地提取标题，避免 null/undefined
      const rawTitle = match[2] || match[1] || '';
      const title = rawTitle.trim();

      // 跳过空标题
      if (!title) {
        continue;
      }

      // 判断章节层级
      let level = 1;
      if (match[1] && (match[1].includes('节') || match[1].match(/^\d+\.\d+/))) {
        level = 2;
      }

      chapters.push({
        id: `chapter-${currentChapterId}`,
        title,
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
