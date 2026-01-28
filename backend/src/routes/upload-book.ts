import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { extractPDFMetadata, parsePDF } from '../services/pdfParser.js';
import { parseEPUB } from '../services/epubParser.js';
import { analyzeBookMetadata } from '../services/bookMetadataAnalyzer.js';
import { extractMetadataFromFileName } from '../services/geminiMetadataExtractor.js';
import { analyzeMetadata, convertToMarkdown } from '../services/llmService.js';
import { extractCoverImage } from '../services/imageService.js';

const router = express.Router();

// 配置 multer 用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB 限制 (支持大文件)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/epub+zip',
      'text/plain',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，仅支持 PDF、EPUB、TXT'));
    }
  },
});

/**
 * POST /api/upload-book
 * 上传并解析图书文件（原始接口，兼容其他用途）
 */
router.post('/upload-book', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '未上传文件',
      });
    }

    const file = req.file;
    const fileFormat = getFileFormat(file.mimetype);

    console.log(`开始解析 ${fileFormat.toUpperCase()} 文件: ${file.originalname}`);

    let parseResult;

    switch (fileFormat) {
      case 'pdf':
        parseResult = await parsePDF(file.buffer);
        break;

      case 'epub':
        parseResult = await parseEPUB(file.buffer);
        break;

      case 'txt':
        // TXT 文件直接读取文本内容
        parseResult = {
          content: file.buffer.toString('utf-8'),
          pageCount: 1,
          estimatedMetadata: {},
          tableOfContents: [],
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `不支持的文件格式: ${fileFormat}`,
        });
    }

    // 使用 Gemini 分析元数据
    console.log('开始 AI 元数据分析...');
    const aiMetadata = await analyzeBookMetadata(
      parseResult.content,
      parseResult.tableOfContents,
      file.originalname
    );

    // 返回解析结果和 AI 元数据
    return res.json({
      success: true,
      data: {
        fileName: file.originalname,
        fileFormat,
        fileSize: file.size,
        pageCount: parseResult.pageCount,
        content: parseResult.content,
        // 合并初步元数据和 AI 元数据
        metadata: {
          ...parseResult.estimatedMetadata,
          ...aiMetadata,
        },
      },
    });
  } catch (error) {
    console.error('文件解析失败:', error);
    const message = error instanceof Error ? error.message : '文件解析失败';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/upload-book/parse
 * 解析已上传的图书文件（通过文件路径，只提取元数据，不调用 AI）
 */
router.post('/upload-book/parse', async (req: Request, res: Response) => {
  try {
    console.log('========================================');
    console.log('收到 /api/upload-book/parse 请求');
    console.log('请求体:', req.body);

    const { filePath, fileName } = req.body;

    if (!filePath || !fileName) {
      console.error('❌ 缺少必要参数');
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
      });
    }

    console.log('✓ 参数验证通过');
    console.log('文件路径:', filePath);
    console.log('文件名:', fileName);

    // 安全检查：确保 filePath 在 data/originals/books 目录内
    const safePath = path.normalize(filePath);
    const fullPath = path.join(process.cwd(), safePath);

    console.log('规范化路径:', safePath);
    console.log('完整路径:', fullPath);

    const allowedPaths = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'data', 'originals', 'books')
    ];

    const isAllowed = allowedPaths.some(allowedPath => fullPath.startsWith(allowedPath));

    if (!isAllowed) {
      console.error('❌ 非法的文件路径');
      console.error('允许的路径前缀:', allowedPaths);
      return res.status(400).json({
        success: false,
        error: '非法的文件路径',
      });
    }

    console.log('✓ 路径安全检查通过');
    console.log('开始提取元数据:', fileName);

    // 读取文件
    const fileBuffer = await fs.readFile(fullPath);
    const fileFormat = getFileFormatFromFileName(fileName);

    console.log(`文件格式: ${fileFormat}`);

    let basicMetadata;
    let pageCount = 0;

    try {
      switch (fileFormat) {
        case 'pdf':
          console.log('========================================');
          console.log('开始处理 PDF 文件');
          console.log('文件路径:', fullPath);
          console.log('========================================');

          // 使用统一 LLM 服务提取元数据
          console.log('调用 LLM 提取元数据...');
          
          let aiMetadata;
          let coverImage = null;
          
          // 并行执行：元数据提取 + 封面生成
          try {
            // 先解析 PDF 内容（修复 parseResult 未定义的问题）
            const pdfParseResult = await parsePDF(fileBuffer);
            
            const [metadataResult, coverImageName] = await Promise.all([
              analyzeMetadata(pdfParseResult.content, fileName),
              extractCoverImage(fullPath, path.join(process.cwd(), 'uploads', 'covers'))
            ]);
            
            aiMetadata = metadataResult;
            coverImage = coverImageName ? `/uploads/covers/${coverImageName}` : null;
            
            // 异步触发 Markdown 转换和存储 (不阻塞响应)
            // TODO: 这里可以放入消息队列，暂时用异步函数处理
            (async () => {
              try {
                console.log('开始后台转换 Markdown...');
                const markdown = await convertToMarkdown(pdfParseResult.content);
                
                // 确定存储路径
                const subjectDir = aiMetadata?.subject || '其他';
                const outputDir = path.join(process.cwd(), 'data', 'obsidian', 'Books', subjectDir);
                await fs.mkdir(outputDir, { recursive: true });
                
                const mdFileName = `${fileName.replace('.pdf', '')}.md`;
                await fs.writeFile(path.join(outputDir, mdFileName), markdown);
                console.log(`Markdown 已保存至: ${path.join(outputDir, mdFileName)}`);
              } catch (err) {
                console.error('后台 Markdown 转换失败:', err);
              }
            })();

          } catch (aiError) {
            console.error('AI 处理失败:', aiError);
            // 降级处理：仅使用基本信息
            aiMetadata = {
              title: fileName.replace('.pdf', ''),
              subject: '其他',
              grade: '',
              category: '教科书',
              tags: [],
              tableOfContents: []
            };
          }

          // 注意：暂不获取页数（pdf-parse 库存在兼容性问题）
          // pageCount = await extractPDFMetadata(fileBuffer).then(r => r.pageCount).catch(() => 0);
          pageCount = 0;

          console.log('========================================');
          console.log('✓ PDF 处理成功');
          console.log('总页数:', pageCount || '未知');
          console.log('AI 提取的元数据:', JSON.stringify(aiMetadata));
          console.log('封面图片:', coverImage);
          console.log('========================================');

          basicMetadata = {
            title: aiMetadata.title || fileName.replace('.pdf', ''),
            author: aiMetadata.author,
            subject: aiMetadata.subject,
            grade: aiMetadata.grade,
            category: aiMetadata.category,
            publisher: aiMetadata.publisher,
            publishDate: aiMetadata.publishDate,
            coverImage: coverImage,
            coverFormat: 'png',
            aiConfidence: 0.9, // 豆包通常比较准，给个默认高置信度
            fieldConfidence: {}, // 豆包暂不返回字段级置信度
            tags: aiMetadata.tags || [],
            tableOfContents: aiMetadata.tableOfContents || []
          };
          break;

        case 'epub':
          console.log('解析 EPUB...');
          const epubData = await parseEPUB(fileBuffer);
          basicMetadata = {
            title: epubData.estimatedMetadata.title || fileName.replace(/\.epub$/i, ''),
            author: epubData.estimatedMetadata.author || '',
            subject: '其他',
            grade: '',
            category: '教科书',
            publisher: '',
            publishDate: '',
            coverImage: null,
            aiConfidence: 0.5,
          };
          pageCount = epubData.pageCount;
          console.log(`EPUB 解析成功，页数: ${pageCount}`);
          break;

        case 'txt':
          basicMetadata = {
            title: fileName.replace(/\.txt$/i, ''),
            author: '',
            subject: '其他',
            grade: '',
            category: '课外读物',
            publisher: '',
            publishDate: '',
            coverImage: null,
            aiConfidence: 0.5,
          };
          pageCount = 1;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: `不支持的文件格式: ${fileFormat}`
          });
      }

      // 构建最终元数据
      const finalMetadata = {
        title: basicMetadata.title || fileName.replace(/\.(pdf|epub|txt)$/i, ''),
        author: basicMetadata.author || '',
        subject: basicMetadata.subject || '其他',
        grade: basicMetadata.grade || '',
        category: basicMetadata.category || '教科书',
        publisher: basicMetadata.publisher || '',
        publishDate: basicMetadata.publishDate || '',
        coverImage: basicMetadata.coverImage,
        tags: []  // 前端会添加用户名作为默认标签
      };

      console.log('返回的元数据:', finalMetadata);

      // 返回元数据（包含置信度）
      return res.json({
        success: true,
        data: {
          fileName: fileName,
          fileFormat,
          fileSize: fileBuffer.length,
          pageCount: pageCount,
          metadata: finalMetadata,
          confidence: {
            overall: basicMetadata.aiConfidence || 0,
            fields: basicMetadata.fieldConfidence || {}
          },
          extractionMethod: 'gemini'
        },
      });
    } catch (parseError) {
      console.error('文件解析失败:', parseError);

      // 解析失败时使用文件名作为默认值
      const fallbackMetadata = {
        title: fileName.replace(/\.(pdf|epub|txt)$/i, ''),
        author: '',
        subject: '其他',
        grade: '',
        category: '教科书',
        publisher: '',
        publishDate: '',
        tags: []
      };

      console.log('使用默认元数据:', fallbackMetadata);

      return res.json({
        success: true,
        data: {
          fileName: fileName,
          fileFormat,
          fileSize: fileBuffer.length,
          pageCount: 0,
          metadata: fallbackMetadata,
        },
      });
    }
  } catch (error) {
    console.error('请求处理失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '请求处理失败',
    });
  }
});

/**
 * 根据 MIME 类型获取文件格式
 */
function getFileFormat(mimeType: string): 'pdf' | 'epub' | 'txt' {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  } else if (mimeType === 'application/epub+zip') {
    return 'epub';
  } else if (mimeType === 'text/plain') {
    return 'txt';
  }
  throw new Error(`未知的 MIME 类型: ${mimeType}`);
}

/**
 * 根据文件名获取文件格式
 */
function getFileFormatFromFileName(fileName: string): 'pdf' | 'epub' | 'txt' {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.epub') return 'epub';
  if (ext === '.txt') return 'txt';
  return 'pdf'; // 默认
}

export default router;
