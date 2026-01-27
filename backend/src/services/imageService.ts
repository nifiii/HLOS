import pdf2img from 'pdf-img-convert';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

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
    // 转换第一页
    // pdf-img-convert 支持 Buffer 或文件路径
    const outputImages = await pdf2img.convert(pdfBuffer, {
      width: 600, // 缩略图宽度
      height: 848, // 保持 A4 比例大概
      page_numbers: [1], // 只取第一页
      base64: false,
      format: 'png'
    });

    if (!outputImages || outputImages.length === 0) {
      throw new Error('无法从 PDF 生成图片');
    }

    // 生成唯一文件名
    const imageName = `cover-${uuidv4()}.png`;
    const outputPath = path.join(outputDir, imageName);

    // 确保目录存在
    await fs.mkdir(outputDir, { recursive: true });

    // 写入文件 (outputImages[0] 是 Uint8Array，可以直接写入)
    await fs.writeFile(outputPath, outputImages[0]);

    return imageName;
  } catch (error) {
    console.error('封面提取失败:', error);
    throw error;
  }
}
