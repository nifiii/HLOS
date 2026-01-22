import * as pdfjsLib from 'pdfjs-dist';
import { PageExtractionResult, CoverImageResult } from '../types/pdf.js';
import path from 'path';

// 配置 worker (pdfjs-dist v3+ 需要手动配置 worker)
// 使用绝对路径指向 worker 文件
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
  process.cwd(),
  'node_modules',
  'pdfjs-dist',
  'build',
  'pdf.worker.min.js'
);

/**
 * 提取 PDF 前 N 页的文本内容
 * @param buffer PDF 文件 Buffer
 * @param pageCount 提取页数（默认 4 页）
 * @returns 前 N 页的文本内容数组
 */
export async function extractFirstPages(
  buffer: Buffer,
  pageCount: number = 4
): Promise<PageExtractionResult[]> {
  try {
    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdfDocument = await loadingTask.promise;

    const totalPages = pdfDocument.numPages;
    const pagesToExtract = Math.min(pageCount, totalPages);

    console.log(`PDF 总页数: ${totalPages}, 提取前 ${pagesToExtract} 页`);

    const results: PageExtractionResult[] = [];

    // 逐页提取文本
    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();

      // 提取并拼接文本项
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();

      results.push({
        text: pageText,
        pageNumber: i,
      });

      console.log(`第 ${i} 页提取完成，文本长度: ${pageText.length}`);
    }

    return results;
  } catch (error) {
    console.error('PDF 页面提取失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    throw new Error(`PDF 页面提取失败: ${message}`);
  }
}

/**
 * 提取 PDF 第 1 页作为封面图片
 * @param buffer PDF 文件 Buffer
 * @returns 封面图片的 base64 编码
 */
export async function extractCoverImage(buffer: Buffer): Promise<CoverImageResult | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdfDocument = await loadingTask.promise;

    const page = await pdfDocument.getPage(1);

    // 设置缩放比例（2.0 以获得清晰图片）
    const viewport = page.getViewport({ scale: 2.0 });

    // 在 Node.js 环境中，我们需要使用 canvas 或其他库
    // 这里先返回 null，稍后可以实现基于 node-canvas 的版本
    console.warn('封面图片提取功能在 Node.js 环境中暂未实现');
    return null;

    // TODO: 实现 node-canvas 版本
    // const canvas = createCanvas(viewport.width, viewport.height);
    // const context = canvas.getContext('2d');
    // await page.render({ canvasContext: context, viewport }).promise;
    // const base64 = canvas.toDataURL('image/png').split(',')[1];
    // return { base64, format: 'png' };
  } catch (error) {
    console.error('封面图片提取失败:', error);
    // 封面提取失败不阻断流程，返回 null
    return null;
  }
}

/**
 * 获取 PDF 总页数
 * @param buffer PDF 文件 Buffer
 * @returns 总页数
 */
export async function getPDFPageCount(buffer: Buffer): Promise<number> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdfDocument = await loadingTask.promise;
    return pdfDocument.numPages;
  } catch (error) {
    console.error('PDF 页数获取失败:', error);
    throw new Error('PDF 页数获取失败');
  }
}
