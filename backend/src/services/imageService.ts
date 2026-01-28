import pdfjsLib from 'pdfjs-dist';
import { createCanvas, Canvas, Image } from 'canvas';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// 配置 PDF.js worker
const { getDocument, GlobalWorkerOptions } = pdfjsLib;
// 确保 workerSrc 已设置 (如果是第一次调用)
if (!GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js';
}

/**
 * NodeCanvasFactory 用于在 Node.js 环境中创建 Canvas
 * 参考: https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.js
 */
class NodeCanvasFactory {
  create(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error("Invalid canvas size");
    }
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return {
      canvas: canvas,
      context: context,
    };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error("Invalid canvas size");
    }
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any) {
    if (canvasAndContext.canvas) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
    }
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

/**
 * 提取 PDF 封面并保存为图片
 * @param pdfBuffer PDF 文件 Buffer 或路径
 * @param outputDir 输出目录
 * @returns 生成的图片文件名
 */
export async function extractCoverImage(
  pdfBuffer: Buffer | string,
  outputDir: string
): Promise<string> {
  try {
    let data: Uint8Array;

    if (Buffer.isBuffer(pdfBuffer)) {
      data = new Uint8Array(pdfBuffer);
    } else if (typeof pdfBuffer === 'string') {
      const buffer = await fs.readFile(pdfBuffer);
      data = new Uint8Array(buffer);
    } else {
      throw new Error('无效的 PDF 数据');
    }

    // 加载 PDF 文档
    const loadingTask = getDocument({
      data,
      cMapUrl: 'pdfjs-dist/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'pdfjs-dist/standard_fonts/',
      disableFontFace: true, // 禁用字体加载，避免某些环境下的问题
    });

    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);

    // 计算缩放比例 (目标宽度 600px)
    const viewport = page.getViewport({ scale: 1.0 });
    const targetWidth = 600;
    const scale = targetWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    // 创建 Canvas
    const canvasFactory = new NodeCanvasFactory();
    const canvasAndContext = canvasFactory.create(
      scaledViewport.width,
      scaledViewport.height
    );

    // 渲染页面
    const renderContext = {
      canvasContext: canvasAndContext.context,
      viewport: scaledViewport,
      canvasFactory: canvasFactory,
    };

    await page.render(renderContext).promise;

    // 保存为图片
    const buffer = canvasAndContext.canvas.toBuffer('image/png');
    
    // 生成唯一文件名
    const imageName = `cover-${uuidv4()}.png`;
    const outputPath = path.join(outputDir, imageName);

    // 确保目录存在
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(outputPath, buffer);

    // 清理
    canvasFactory.destroy(canvasAndContext);
    
    // 释放 PDF 文档资源 (如果支持 destroy 方法)
    if (pdfDocument.destroy) {
      pdfDocument.destroy();
    }

    return imageName;
  } catch (error) {
    console.error('封面提取失败:', error);
    // 不抛出错误，而是返回空字符串或 null，让上层处理降级
    // 或者抛出错误，让上层决定
    throw error;
  }
}
