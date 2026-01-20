import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyzeRouter from './routes/analyze.js';
import coursewareRouter from './routes/courseware.js';
import assessmentRouter from './routes/assessment.js';
import anythingllmRouter from './routes/anythingllm.js';
import uploadBookRouter from './routes/upload-book.js';
import saveScannedItemRouter from './routes/saveScannedItem.js';
import scannedItemsRouter from './routes/scannedItems.js';
import saveBookRouter from './routes/saveBook.js';
import booksRouter from './routes/books.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// 路由
app.use('/api', analyzeRouter);
app.use('/api', coursewareRouter);
app.use('/api', assessmentRouter);
app.use('/api/anythingllm', anythingllmRouter);
app.use('/api', uploadBookRouter);
app.use('/api', saveScannedItemRouter);
app.use('/api', scannedItemsRouter);
app.use('/api', saveBookRouter);
app.use('/api', booksRouter);

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
});
