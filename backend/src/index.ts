import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import analyzeRouter from './routes/analyze.js';
import coursewareRouter from './routes/courseware.js';
import assessmentRouter from './routes/assessment.js';
import saveScannedItemRouter from './routes/saveScannedItem.js';
import scannedItemsRouter from './routes/scannedItems.js';
import saveBookRouter from './routes/saveBook.js';
import booksRouter from './routes/books.js';
import authRouter from './routes/auth.js';
import uploadBookRouter from './routes/upload-book.js';
import { cleanupTempChunks } from './utils/cleanup.js';
import { initDatabase } from './services/databaseService.js';

dotenv.config();

// 初始化数据库
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  // 详细日志：记录 Content-Type 和请求头
  if (req.path.includes('upload')) {
    console.log('  Content-Type:', req.get('content-type'));
    console.log('  Content-Length:', req.get('content-length'));
  }
  next();
});

// 静态文件服务
// 1. 上传的临时文件
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// 2. 数据目录 (用于 serving 封面等)
// 注意：生产环境建议使用 Nginx
const DATA_DIR = process.env.DATA_DIR || '/opt/hl-os/data';
app.use('/covers', express.static(path.join(DATA_DIR, 'obsidian', 'covers')));
app.use('/data/images', express.static(path.join(DATA_DIR, 'originals', 'images')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// 路由
app.use('/api/auth', authRouter);
app.use('/api', analyzeRouter);
app.use('/api', coursewareRouter);
app.use('/api', assessmentRouter);
app.use('/api', saveScannedItemRouter);
app.use('/api', scannedItemsRouter);
app.use('/api', saveBookRouter);
app.use('/api', booksRouter);
app.use('/api', uploadBookRouter);

// 测试端点：验证 FormData 请求
app.post('/api/test-upload', (req, res) => {
  console.log('测试端点被调用');
  console.log('Headers:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body));
  res.json({ success: true, message: '测试成功' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);

  // 启动时清理一次过期文件
  cleanupTempChunks().catch(console.error);

  // 定期清理（每小时）
  setInterval(() => {
    cleanupTempChunks().catch(console.error);
  }, 60 * 60 * 1000);
});
