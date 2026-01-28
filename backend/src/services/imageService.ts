import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 提取 PDF 封面并保存为图片 (使用 pdftoppm 工具)
 * @param pdfBuffer PDF 文件 Buffer 或路径
 * @param outputDir 输出目录
 * @returns 生成的图片文件名
 */
export async function extractCoverImage(
  pdfBuffer: Buffer | string,
  outputDir: string
): Promise<string> {
  let tempPdfPath: string | null = null;

  try {
    // 1. 准备 PDF 文件路径
    let inputPdfPath: string;

    if (Buffer.isBuffer(pdfBuffer)) {
      // 如果是 Buffer，需要先写入临时文件
      const tempId = uuidv4();
      tempPdfPath = path.join(outputDir, `temp-${tempId}.pdf`);
      await fs.writeFile(tempPdfPath, pdfBuffer);
      inputPdfPath = tempPdfPath;
    } else if (typeof pdfBuffer === 'string') {
      inputPdfPath = pdfBuffer;
    } else {
      throw new Error('无效的 PDF 数据');
    }

    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });

    // 2. 生成唯一的输出文件前缀
    const outputPrefix = `cover-${uuidv4()}`;
    const outputBasePath = path.join(outputDir, outputPrefix);

    // 3. 执行 pdftoppm 命令
    // 命令: pdftoppm -jpeg -f 1 -l 1 input.pdf output_prefix
    // 这将生成 output_prefix-1.jpg
    const command = `pdftoppm -jpeg -f 1 -l 1 "${inputPdfPath}" "${outputBasePath}"`;
    
    console.log('执行封面提取命令:', command);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.warn('pdftoppm stderr:', stderr);
    }

    // 4. 确定生成的文件名
    // pdftoppm 可能会生成 -1.jpg, -01.jpg, -001.jpg 等，取决于版本和总页数
    const files = await fs.readdir(outputDir);
    const generatedFileName = files.find(f => f.startsWith(outputPrefix) && f.endsWith('.jpg'));

    if (!generatedFileName) {
      console.error('pdftoppm 输出目录内容:', files);
      throw new Error(`封面生成失败，在目录 ${outputDir} 中未找到前缀为 ${outputPrefix} 的 .jpg 文件`);
    }

    const generatedFilePath = path.join(outputDir, generatedFileName);

    // 5. 重命名为最终文件名 (去掉页码后缀)
    const finalFileName = `${outputPrefix}.jpg`;
    const finalFilePath = path.join(outputDir, finalFileName);
    
    await fs.rename(generatedFilePath, finalFilePath);

    return finalFileName;

  } catch (error) {
    console.error('封面提取失败:', error);
    // 抛出错误让上层处理
    throw error;
  } finally {
    // 清理临时 PDF 文件 (如果是我们创建的)
    if (tempPdfPath) {
      try {
        await fs.unlink(tempPdfPath);
      } catch (e) {
        console.warn('清理临时 PDF 文件失败:', e);
      }
    }
  }
}
