# 分片上传与多图片处理优化设计文档

**设计日期**: 2026-01-21
**设计目标**: 优化大文件上传体验，支持多页试卷处理
**核心原则**: 稳定可靠、用户体验优先、KISS 原则

---

## 1. 设计背景

### 1.1 当前系统现状

**已有实现**：
- ✅ BookUploader：支持 PDF/EPUB/TXT 上传（最大100MB）
- ✅ CaptureModule：支持单张图片上传和 OCR 识别
- ✅ 数据存储：服务端文件系统 + PostgreSQL

**存在的问题**：
- ❌ 大文件上传无进度反馈，用户不知道是否卡死
- ❌ 网络中断需要重新上传整个文件（100MB重新传）
- ❌ 多页试卷需要逐张手动上传，无法关联
- ❌ 拍题上传 base64 未压缩，占用大量内存

### 1.2 用户需求

**使用场景**：
1. **大文件上传**：图书馆上传 50-100MB 的 PDF 教材
2. **多页试卷**：一次上传整本试卷（3-10张图片），自动关联
3. **网络不稳定**：上传过程中网络中断，能恢复继续

**改进目标**：
- 实时进度反馈（用户知道上传到多少了）
- 支持断点续传（失败只重传失败的部分）
- 支持多图片批量处理（一次上传整本试卷）
- 自动关联同一试卷的不同页

### 1.3 设计原则

**KISS 原则**：
- 不引入复杂的 tus 协议，使用自定义简单分片
- 不压缩图片，保持原图确保 OCR 精度
- 串行 OCR 处理，稳定可靠

**决策依据**：
- ❌ 放弃图片压缩（会影响 OCR 识别精度）
- ✅ 实施分片上传（提升用户体验和可靠性）
- ✅ 实施多图片上传（解决多页试卷痛点）

---

## 2. 技术方案

### 2.1 分片上传方案

**不采用 tus 协议**，使用自定义简单分片实现：

**分片大小**：5MB/片
- 小文件（<5MB）：直接上传
- 中等文件（5-50MB）：5MB 分片
- 大文件（>50MB）：5MB 分片（不变）

**理由**：
- 5MB 分片平衡了进度更新频率和请求次数
- 100MB 文件 = 20次请求，进度每5%更新一次
- 失败重传代价小（最多重传 5MB）

### 2.2 多图片上传方案

**UI 模式**：逐张追加
- 用户每次选择一张或若干张图片
- 添加到预览列表
- 可以删除、重排序
- 最后点击"开始识别全部"

**OCR 处理**：串行处理
- 一张一张识别（识别完第1页 → 再识别第2页）
- 显示总体进度（"正在识别第 2/3 页..."）
- 失败后停止，不继续处理后续图片

**数据组合**：分页保存
- 每页独立存储（独立的 ScannedItem）
- 通过 `parentExamId` 关联同一试卷的不同页
- 包含页码信息（pageNumber, totalPages）

---

## 3. 系统架构

### 3.1 分片上传流程

```
用户选择文件
    ↓
文件大小检测
    ├─ <5MB: 直接上传
    └─ ≥5MB: 分片上传
         ↓
    生成唯一 fileId
         ↓
    循环上传每个分片
         ├─ 上传分片
         ├─ 更新进度
         ├─ 失败自动重试（3次）
         └─ 支持暂停/继续
         ↓
    所有分片上传完成
         ↓
    通知后端合并
         ↓
    返回完整文件路径
```

### 3.2 多图片上传流程

```
用户选择第1张图片
    ↓
显示预览缩略图
    ↓
用户选择第2张图片
    ↓
显示预览缩略图
    ↓
用户选择第3张图片
    ↓
显示预览缩略图
    ↓
用户点击"开始识别全部"
    ↓
生成 parentExamId
    ↓
串行处理每张图片
    ├─ 第1页：分片上传 → OCR识别 → 保存
    ├─ 第2页：分片上传 → OCR识别 → 保存
    └─ 第3页：分片上传 → OCR识别 → 保存
    ↓
    批量保存到服务器
    ↓
    触发成功动画
```

---

## 4. 技术实现

### 4.1 前端实现

#### 4.1.1 分片上传 Hook

**文件**：`hooks/useChunkedUpload.ts`

```typescript
import { useState } from 'react';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  chunkIndex: number;
  totalChunks: number;
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number) => void;
  maxRetries?: number;
}

export const useChunkedUpload = () => {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  const uploadFile = async (
    file: File,
    options: UploadOptions = {}
  ): Promise<string> => {
    const { onProgress, onChunkComplete, maxRetries = 3 } = options;

    // 小文件直接上传
    if (file.size < CHUNK_SIZE) {
      return uploadDirectly(file, onProgress);
    }

    // 大文件分片上传
    const fileId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      await uploadWithRetry(chunk, fileId, i, totalChunks, file.name, maxRetries);

      // 更新进度
      if (onProgress) {
        onProgress({
          loaded: end,
          total: file.size,
          percentage: ((i + 1) / totalChunks) * 100,
          chunkIndex: i,
          totalChunks
        });
      }

      if (onChunkComplete) {
        onChunkComplete(i);
      }
    }

    // 合并分片
    const result = await fetch('/api/merge-chunks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        originalName: file.name,
        totalChunks
      })
    });

    if (!result.ok) {
      throw new Error('合并分片失败');
    }

    const data = await result.json();
    return data.filePath;
  };

  const uploadDirectly = async (
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-direct', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('上传失败');
    }

    const data = await response.json();
    return data.filePath;
  };

  const uploadWithRetry = async (
    chunk: Blob,
    fileId: string,
    chunkIndex: number,
    totalChunks: number,
    originalName: string,
    maxRetries: number
  ) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const formData = new FormData();
        formData.append('fileId', fileId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('originalName', originalName);
        formData.append('chunk', chunk, `chunk-${chunkIndex}`);

        const response = await fetch('/api/upload-chunk', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(30000) // 30秒超时
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        return result;

      } catch (error) {
        console.warn(`分片${chunkIndex}上传失败，尝试${attempt + 1}/${maxRetries}`, error);

        if (attempt === maxRetries - 1) {
          throw new Error(`分片${chunkIndex}上传失败，已达最大重试次数`);
        }

        // 等待后重试（指数退避）
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  };

  return { uploadFile };
};
```

#### 4.1.2 进度条组件

**文件**：`components/UploadProgressBar.tsx`

```typescript
import React from 'react';
import { Loader2 } from 'lucide-react';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  chunkIndex: number;
  totalChunks: number;
}

interface UploadProgressBarProps {
  progress: UploadProgress;
  fileName?: string;
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  progress,
  fileName
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* 文件名 */}
      {fileName && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 truncate flex-1">
            {fileName}
          </span>
          <span className="text-sm text-gray-500 ml-2">
            {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
          </span>
        </div>
      )}

      {/* 进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-sky-400 to-mint-400 h-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
        />
      </div>

      {/* 进度信息 */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
        <span className="font-medium">
          {progress.percentage.toFixed(0)}%
        </span>
        <span>
          分片 {progress.chunkIndex + 1}/{progress.totalChunks}
        </span>
      </div>
    </div>
  );
};
```

#### 4.1.3 BookUploader 组件更新

**文件**：`components/BookUploader.tsx`

```typescript
import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import { UploadProgressBar } from './UploadProgressBar';
import { EBook } from '../types';

export const BookUploader: React.FC<BookUploaderProps> = ({ onUploadSuccess, ownerId }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const { uploadFile } = useChunkedUpload();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['application/pdf', 'application/epub+zip', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('仅支持 PDF、EPUB、TXT 格式');
      return;
    }

    // 验证文件大小 (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('文件大小不能超过 100MB');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      // 分片上传
      const filePath = await uploadFile(file, {
        onProgress: (prog) => {
          setProgress(prog);
        }
      });

      // 上传完成，等待后端解析
      setProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
        chunkIndex: 0,
        totalChunks: 1
      });

      // 通知后端解析
      const response = await fetch('/api/parse-uploaded-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          ownerId
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '解析失败');
      }

      setSuccess(true);
      onUploadSuccess(result.data);

    } catch (err: any) {
      console.error('上传失败:', err);
      setError(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 上传区域 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-sky-500 transition">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <label className="cursor-pointer">
          <span className="text-sm font-medium text-sky-600 hover:text-sky-700">
            点击上传图书
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.epub,.txt"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">
          支持 PDF、EPUB、TXT 格式，最大 100MB
        </p>
      </div>

      {/* 进度条 */}
      {uploading && progress && (
        <div className="mt-4">
          <UploadProgressBar progress={progress} />
        </div>
      )}

      {/* 成功状态 */}
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <span className="text-sm font-medium text-green-800">
            文件上传并解析成功！
          </span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <span className="text-sm font-medium text-red-800">
            {error}
          </span>
        </div>
      )}
    </div>
  );
};
```

#### 4.1.4 CaptureModule 多图片上传

**文件**：`components/CaptureModule.tsx`

```typescript
import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Plus, X, Loader2, CheckCircle } from 'lucide-react';
import { analyzeImage } from '../services/geminiService';
import { saveScannedItemToServer } from '../services/apiService';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import { ScannedItem, UserProfile, DocType } from '../types';

interface CaptureModuleProps {
  onScanComplete: (item: ScannedItem) => void;
  currentUser: UserProfile;
}

export const CaptureModule: React.FC<CaptureModuleProps> = ({
  onScanComplete,
  currentUser
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [ocrResults, setOcrResults] = useState<ScannedItem[]>([]);
  const [processingIndex, setProcessingIndex] = useState<number>(-1);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile } = useChunkedUpload();

  // 添加图片
  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    setSelectedFiles(prev => [...prev, ...files]);
    setError('');

    // 生成预览
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // 重置 input，允许选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 删除图片
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setOcrResults(prev => prev.filter((_, i) => i !== index));
  };

  // 清空全部
  const handleClearAll = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setOcrResults([]);
    setError('');
  };

  // 批量处理
  const handleBatchProcess = async () => {
    if (selectedFiles.length === 0) return;

    const parentExamId = `exam_${Date.now()}`;
    const results: ScannedItem[] = [];
    const failedIndices: number[] = [];

    setProcessingIndex(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        try {
          setError('');

          // 1. 分片上传图片
          const imagePath = await uploadFile(selectedFiles[i], {
            onProgress: (progress) => {
              console.log(`图片${i + 1}上传进度: ${progress.percentage.toFixed(0)}%`);
            }
          });

          // 2. OCR 识别
          const result = await analyzeImage(previews[i]);

          // 3. 创建扫描项
          const item: ScannedItem = {
            id: `${parentExamId}_page_${i + 1}`,
            ownerId: currentUser.id,
            timestamp: Date.now(),
            imageUrl: imagePath,
            rawMarkdown: result.text,
            parentExamId: parentExamId,
            pageNumber: i + 1,
            totalPages: selectedFiles.length,
            meta: {
              ...result.meta,
              type: DocType.EXAM
            },
            status: 'PROCESSED'
          };

          results.push(item);
          setOcrResults(prev => [...prev, item]);

        } catch (err: any) {
          console.error(`第${i + 1}张图片识别失败:`, err);
          failedIndices.push(i);
          setError(`第${i + 1}张图片识别失败: ${err.message}`);
          break; // 串行处理，失败后停止
        }

        setProcessingIndex(i + 1);
      }

      // 4. 批量保存到服务器
      await Promise.all(results.map(item => saveScannedItemToServer(item, item.imageUrl)));

      // 5. 通知父组件
      results.forEach(item => onScanComplete(item));

      // 6. 成功动画
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4A90E2', '#5FD4A0', '#FFB84D']
      });

      // 7. 显示结果汇总
      if (failedIndices.length > 0) {
        alert(
          `识别完成！\n成功: ${selectedFiles.length - failedIndices.length} 张\n失败: ${failedIndices.length} 张（第 ${failedIndices.map(i => i + 1).join(', ')} 页）`
        );
      }

      // 8. 重置
      setTimeout(() => {
        handleClearAll();
        setProcessingIndex(-1);
      }, 2000);

    } catch (err: any) {
      console.error('批量处理失败:', err);
      setError(err.message || '批量处理失败');
      setProcessingIndex(-1);
    }
  };

  return (
    <div className="space-y-6">
      {/* 选择图片区域 */}
      <div>
        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-sky-500 transition cursor-pointer">
            <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <span className="text-sm font-medium text-sky-600">
              点击添加图片（支持多选）
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileAdd}
              disabled={processingIndex >= 0}
            />
            <p className="text-xs text-gray-500 mt-2">
              支持 JPG、PNG 格式，可一次上传整本试卷
            </p>
          </div>
        </label>
      </div>

      {/* 预览区域 */}
      {previews.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            已选择 {previews.length} 张图片
          </h3>

          {/* 图片网格 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                {/* 图片预览 */}
                <img
                  src={preview}
                  alt={`预览${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                />

                {/* 页码标记 */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  第 {index + 1} 页
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => handleRemoveFile(index)}
                  disabled={processingIndex >= 0}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition disabled:opacity-0 disabled:cursor-not-allowed"
                >
                  <X size={16} />
                </button>

                {/* 处理中遮罩 */}
                {processingIndex === index && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <Loader2 className="animate-spin text-white" size={24} />
                    <span className="text-white text-sm ml-2">识别中...</span>
                  </div>
                )}

                {/* 完成标记 */}
                {ocrResults[index] && (
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <CheckCircle size={12} />
                    已识别
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleBatchProcess}
              disabled={previews.length === 0 || processingIndex >= 0}
              className="flex-1 bg-gradient-to-r from-sky-400 to-mint-400 text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {processingIndex >= 0
                ? `正在识别第 ${processingIndex + 1}/${previews.length} 页...`
                : `开始识别全部（${previews.length}张）`
              }
            </button>

            <button
              onClick={handleClearAll}
              disabled={processingIndex >= 0}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              清空全部
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-sm font-medium text-red-800">{error}</span>
        </div>
      )}
    </div>
  );
};
```

### 4.2 后端实现

#### 4.2.1 分片接收接口

**文件**：`backend/src/routes/upload-chunk.ts`

```typescript
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// 临时分片存储目录
const CHUNKS_DIR = path.join('/tmp', 'uploads', 'chunks');

// 确保目录存在
const ensureDir = async () => {
  await fs.mkdir(CHUNKS_DIR, { recursive: true });
};

// Multer 配置（内存存储）
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 记录上传状态
const uploadState = new Map<string, {
  uploadedChunks: Set<number>;
  totalChunks: number;
  fileName: string;
}>();

// POST /api/upload-chunk - 接收单个分片
router.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
  try {
    await ensureDir();

    const { fileId, chunkIndex, totalChunks, originalName } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: '未找到分片数据' });
    }

    const chunkIndexNum = parseInt(chunkIndex);
    const totalChunksNum = parseInt(totalChunks);

    // 创建分片目录
    const chunkDir = path.join(CHUNKS_DIR, fileId);
    await fs.mkdir(chunkDir, { recursive: true });

    // 保存分片
    const chunkPath = path.join(chunkDir, `chunk-${chunkIndexNum}`);
    await fs.writeFile(chunkPath, req.file.buffer);

    // 更新上传状态
    if (!uploadState.has(fileId)) {
      uploadState.set(fileId, {
        uploadedChunks: new Set(),
        totalChunks: totalChunksNum,
        fileName: originalName
      });
    }
    uploadState.get(fileId)!.uploadedChunks.add(chunkIndexNum);

    console.log(`分片上传成功: ${fileId}, 分片 ${chunkIndexNum}/${totalChunksNum}`);

    res.json({
      success: true,
      chunkIndex: chunkIndexNum,
      message: '分片上传成功'
    });

  } catch (error) {
    console.error('分片上传失败:', error);
    res.status(500).json({
      success: false,
      error: '分片上传失败'
    });
  }
});

// POST /api/merge-chunks - 合并所有分片
router.post('/merge-chunks', async (req, res) => {
  try {
    const { fileId, originalName, totalChunks } = req.body;

    const chunkDir = path.join(CHUNKS_DIR, fileId);
    const finalDir = path.join('/opt', 'hl-os', 'data', 'uploads');
    await fs.mkdir(finalDir, { recursive: true });

    // 生成最终文件路径
    const fileExt = path.extname(originalName);
    const finalFileName = `${fileId}${fileExt}`;
    const finalPath = path.join(finalDir, finalFileName);

    // 合并分片
    const writeStream = fs.createWriteStream(finalPath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk-${i}`);
      const chunkBuffer = await fs.readFile(chunkPath);
      writeStream.write(chunkBuffer);
    }

    writeStream.end();

    // 等待写入完成
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // 清理临时分片
    await fs.rm(chunkDir, { recursive: true });
    uploadState.delete(fileId);

    console.log(`分片合并成功: ${fileId} -> ${finalPath}`);

    res.json({
      success: true,
      filePath: finalPath,
      fileName: finalFileName
    });

  } catch (error) {
    console.error('分片合并失败:', error);
    res.status(500).json({
      success: false,
      error: '分片合并失败'
    });
  }
});

// GET /api/check-chunks/:fileId - 检查已上传的分片（断点续传）
router.get('/check-chunks/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const state = uploadState.get(fileId);

    if (!state) {
      return res.json({
        success: true,
        exists: false,
        uploadedChunks: []
      });
    }

    res.json({
      success: true,
      exists: true,
      uploadedChunks: Array.from(state.uploadedChunks),
      totalChunks: state.totalChunks
    });

  } catch (error) {
    console.error('检查分片失败:', error);
    res.status(500).json({
      success: false,
      error: '检查分片失败'
    });
  }
});

// POST /api/upload-direct - 直接上传（小文件）
router.post('/upload-direct', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未找到文件' });
    }

    const uploadDir = path.join('/opt', 'hl-os', 'data', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, req.file.buffer);

    res.json({
      success: true,
      filePath: filePath
    });

  } catch (error) {
    console.error('直接上传失败:', error);
    res.status(500).json({
      success: false,
      error: '直接上传失败'
    });
  }
});

export default router;
```

#### 4.2.2 临时文件清理

**文件**：`backend/src/utils/cleanup.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';

const CHUNKS_DIR = path.join('/tmp', 'uploads', 'chunks');

// 清理超过24小时的临时分片
export const cleanupOldChunks = async () => {
  try {
    const entries = await fs.readdir(CHUNKS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const chunkPath = path.join(CHUNKS_DIR, entry.name);
      const stats = await fs.stat(chunkPath);

      const age = Date.now() - stats.mtimeMs;
      const maxAge = 24 * 60 * 60 * 1000; // 24小时

      if (age > maxAge) {
        await fs.rm(chunkPath, { recursive: true });
        console.log(`清理过期分片: ${entry.name}`);
      }
    }

  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
};

// 启动定时清理（每小时执行一次）
export const startCleanupScheduler = () => {
  // 每小时执行一次
  setInterval(cleanupOldChunks, 60 * 60 * 1000);

  // 启动时立即执行一次
  cleanupOldChunks();
};
```

---

## 5. 数据结构更新

### 5.1 ScannedItem 接口扩展

**文件**：`types.ts`

```typescript
interface ScannedItem {
  id: string;
  ownerId: string;
  timestamp: number;
  imageUrl: string;
  rawMarkdown: string;

  // 多页试卷相关
  parentExamId?: string;      // 父试卷ID
  pageNumber?: number;        // 当前页码（从1开始）
  totalPages?: number;        // 总页数
  multiPageSource?: boolean;  // 是否来自多页试卷

  meta: StructuredMetaData;
  status: ProcessingStatus;
}
```

### 5.2 辅助函数

```typescript
// 获取同一试卷的所有页
export const getExamPages = (
  items: ScannedItem[],
  parentExamId: string
): ScannedItem[] => {
  return items
    .filter(item => item.parentExamId === parentExamId)
    .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
};

// 判断是否为多页试卷
export const isMultiPageExam = (item: ScannedItem): boolean => {
  return !!item.multiPageSource && !!item.parentExamId;
};

// 获取试卷的页数范围
export const getExamRange = (item: ScannedItem): string => {
  if (!item.multiPageSource || !item.pageNumber || !item.totalPages) {
    return '';
  }
  return `第 ${item.pageNumber}/${item.totalPages} 页`;
};
```

---

## 6. 错误处理与边界情况

### 6.1 分片上传错误处理

**场景1：分片上传失败**
- 自动重试3次（指数退避：1s, 2s, 3s）
- 仍失败则抛出错误，停止上传
- 提示用户检查网络连接

**场景2：合并分片失败**
- 检查是否所有分片都已上传
- 部分分片缺失则提示重新上传
- 清理已上传的分片，避免占用空间

**场景3：网络中断**
- 前端记录已上传的分片
- 恢复连接后调用 `/api/check-chunks/:fileId`
- 跳过已上传的分片，继续上传剩余分片

### 6.2 OCR 识别错误处理

**场景1：单张图片识别失败**
- 停止后续图片处理
- 显示具体错误信息
- 允许用户删除失败的图片后继续

**场景2：多图片部分失败**
- 显示失败汇总（"成功 2 张，失败 1 张"）
- 标记失败的图片（红色边框）
- 允许重新上传失败的图片

### 6.3 磁盘空间检查

```typescript
const checkDiskSpace = async (requiredBytes: number): Promise<boolean> => {
  try {
    const stats = await fs.statfs('/tmp');
    const freeSpace = stats.available * stats.blockSize;

    // 需要1.5倍空间（临时分片 + 最终文件）
    if (freeSpace < requiredBytes * 1.5) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('检查磁盘空间失败:', error);
    return true; // 检查失败则继续
  }
};
```

### 6.4 并发控制

```typescript
// 防止同时上传多个大文件
const uploadingFiles = new Set<string>();

const uploadFile = async (file: File) => {
  const fileId = generateFileId(file);

  if (uploadingFiles.has(fileId)) {
    throw new Error('文件正在上传中，请勿重复上传');
  }

  uploadingFiles.add(fileId);

  try {
    await performUpload(file);
  } finally {
    uploadingFiles.delete(fileId);
  }
};
```

---

## 7. 性能影响

### 7.1 分片上传性能

**网络开销**：
- 100MB 文件，5MB/片，20个分片
- HTTP 请求头开销：~1KB/请求
- 总开销：20KB（可忽略）

**服务器内存**：
- 临时存储：5MB/片（单个分片）
- 合并时内存：5MB（读）+ 5MB（写）= 10MB
- 峰值内存：<15MB

**磁盘占用**：
- 临时分片：100MB（合并前）
- 最终文件：100MB
- 峰值占用：200MB（合并期间）

### 7.2 多图片处理性能

**串行处理时间**：
- 假设每张图片：上传 2秒 + OCR 5秒 = 7秒
- 3张图片：7秒 × 3 = 21秒
- 并发处理（不推荐）：7秒（但服务器压力大）

**用户体验**：
- 串行处理：可以看到实时进度（"第1/3页"、"第2/3页"...）
- 用户知道系统在工作，不会焦虑

---

## 8. 测试计划

### 8.1 单元测试

**前端测试**：
- [ ] 测试 `useChunkedUpload` hook
- [ ] 测试分片计算逻辑
- [ ] 测试进度更新
- [ ] 测试重试机制

**后端测试**：
- [ ] 测试分片接收接口
- [ ] 测试分片合并逻辑
- [ ] 测试临时文件清理

### 8.2 集成测试

| 测试场景 | 测试步骤 | 预期结果 |
|---------|---------|---------|
| 正常上传 | 上传50MB PDF | 分片上传，进度正常 |
| 小文件直接上传 | 上传3MB PDF | 直接上传，不分片 |
| 网络中断恢复 | 上传100MB，中途断网 | 可以续传 |
| 分片失败重试 | 模拟某片失败 | 自动重试3次 |
| 合并失败 | 缺少部分分片 | 提示重新上传 |
| 多图片上传 | 上传3张试卷图片 | 串行识别，关联正确 |
| 单张失败 | 3张中第2张失败 | 停止处理，提示用户 |
| 磁盘满 | 空间不足时上传 | 提前检查，拒绝上传 |
| 并发控制 | 同时上传两个文件 | 第二个被拒绝 |

### 8.3 性能测试

- [ ] 上传100MB文件，记录时间
- [ ] 上传3张图片，记录总时间
- [ ] 监控服务器内存占用
- [ ] 监控磁盘临时占用

---

## 9. 实施检查清单

### 9.1 前端开发

- [ ] 创建 `hooks/useChunkedUpload.ts`
- [ ] 创建 `components/UploadProgressBar.tsx`
- [ ] 更新 `components/BookUploader.tsx`
- [ ] 更新 `components/CaptureModule.tsx`
- [ ] 添加多图片预览UI
- [ ] 实现串行OCR处理
- [ ] 实现进度显示

### 9.2 后端开发

- [ ] 创建 `backend/src/routes/upload-chunk.ts`
- [ ] 实现分片接收接口
- [ ] 实现分片合并接口
- [ ] 实现断点续传检查接口
- [ ] 创建 `backend/src/utils/cleanup.ts`
- [ ] 实现临时文件清理
- [ ] 添加错误处理

### 9.3 类型定义

- [ ] 更新 `types.ts`，添加多页试卷字段
- [ ] 添加辅助函数（getExamPages, isMultiPageExam等）

### 9.4 集成

- [ ] 后端注册路由
- [ ] 前端导入hooks和组件
- [ ] 端到端测试

### 9.5 测试

- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试
- [ ] 边界测试

---

## 10. 风险评估

### 10.1 技术风险

- ⚠️ **临时文件清理失败**：可能导致磁盘占满
  - 缓解措施：定时清理 + 启动时清理

- ⚠️ **分片合并中断**：可能导致不完整文件
  - 缓解措施：原子操作，失败则回滚

- ⚠️ **并发上传冲突**：多个用户同时上传
  - 缓解措施：fileId 包含时间戳和随机数

### 10.2 用户体验风险

- ⚠️ **上传时间感知**：分片上传可能比直接上传慢
  - 缓解措施：明确的进度反馈

- ⚠️ **多图片处理慢**：串行处理耗时长
  - 缓解措施：清晰的进度提示

---

## 11. 成功标准

### 11.1 功能完整性

- [ ] 100MB文件可以成功上传
- [ ] 进度条实时更新
- [ ] 网络中断可以续传
- [ ] 多图片可以批量上传
- [ ] OCR串行处理正确
- [ ] 同一试卷的图片自动关联

### 11.2 性能标准

- [ ] 100MB文件上传时间 < 120秒
- [ ] 进度条更新延迟 < 100ms
- [ ] 3张图片处理时间 < 30秒

### 11.3 可靠性标准

- [ ] 分片上传成功率 > 95%
- [ ] 断点续传成功率 = 100%
- [ ] 临时文件清理正常工作

---

## 12. 实施计划

### 阶段1：后端基础（1-2小时）
- 实现分片接收接口
- 实现分片合并接口
- 实现断点续传检查

### 阶段2：前端Hook（1小时）
- 实现 useChunkedUpload hook
- 实现进度条组件
- 实现重试逻辑

### 阶段3：BookUploader集成（30分钟）
- 替换上传逻辑
- 添加进度显示
- 测试

### 阶段4：CaptureModule多图片（2小时）
- 实现多图片预览UI
- 实现串行OCR处理
- 实现parentExamId关联

### 阶段5：测试与优化（1小时）
- 功能测试
- 性能测试
- 边界测试

**总计**：约 5-6小时

---

**设计完成，待用户确认后实施。**
