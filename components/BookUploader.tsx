import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { EBook, IndexStatus } from '../types';
import { useChunkedUpload, ChunkedUploadResult } from '../hooks/useChunkedUpload';
import UploadProgressBar from './UploadProgressBar';
import BookMetadataModal from './BookMetadataModal';

interface UploadResult {
  fileName: string;
  fileFormat: 'pdf' | 'epub' | 'txt';
  fileSize: number;
  pageCount: number;
  content: string;
  metadata: {
    title: string;
    author?: string;
    subject: string;
    category: string;
    grade: string;
    tags: string[];
    tableOfContents: any[];
    notes?: string;
  };
  confidence?: {
    overall: number;
    fields: {
      title?: number;
      author?: number;
      subject?: number;
      grade?: number;
      category?: number;
      publisher?: number;
      publishDate?: number;
    };
  };
  extractionMethod?: string;
}

// 扩展 ChunkedUploadResult 以支持置信度
interface ExtendedChunkedUploadResult extends Omit<ChunkedUploadResult, 'metadata'> {
  metadata?: {
    title: string;
    author?: string;
    subject: string;
    category: string;
    grade: string;
    tags: string[];
    tableOfContents?: any[];
    notes?: string;
    fileName?: string;
    fileFormat?: 'pdf' | 'epub' | 'txt';
    fileSize?: number;
    pageCount?: number;
    publisher?: string;
    publishDate?: string;
  };
  confidence?: {
    overall: number;
    fields: {
      title?: number;
      author?: number;
      subject?: number;
      grade?: number;
      category?: number;
      publisher?: number;
      publishDate?: number;
    };
  };
  extractionMethod?: string;
}

interface BookUploaderProps {
  onUploadSuccess: (uploadResult: UploadResult) => void;
  onMetadataConfirmed: () => void;
  ownerId: string;
}

export const BookUploader: React.FC<BookUploaderProps> = ({ onUploadSuccess, onMetadataConfirmed, ownerId }) => {
  const { uploadProgress, isUploading, uploadFile, resetProgress } = useChunkedUpload();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<ExtendedChunkedUploadResult | null>(null);
  const [showEditor, setShowEditor] = useState(false);

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

    setSelectedFile(file);
    setError('');
    setSuccess(false);

    console.log('📤 开始上传图书，端点: /api/upload-chunk');
    // 使用分���上传
    // 使用单文件上传
    const result = await uploadFile(file, ownerId, '/api/upload-book');

    if (result.success && result.data) {
      setSuccess(true);
      
      // 上传成功后，result.data 中已经包含了 metadata
      console.log('✅ 图书上传并解析成功:', result.data);

      const parseData = result.data;
      
      // 更新 uploadResult，包含解析后的元数据和置信度
      setUploadResult({
        success: true,
        filePath: '', // 兼容字段
        metadata: {
          ...parseData.metadata,
          fileName: parseData.fileName,
          fileFormat: parseData.fileFormat,
          fileSize: parseData.fileSize,
          pageCount: parseData.pageCount,
        },
        confidence: parseData.confidence,
        extractionMethod: parseData.extractionMethod
      });

      // 直接显示编辑器，不延迟
      setShowEditor(true);
    } else {
      setError(result.error || '上传失败，请重试');
    }
  };

  const handleSaveMetadata = (metadata: any) => {
    if (!uploadResult || !selectedFile) return;

    const finalResult: UploadResult = {
      fileName: uploadResult.metadata?.fileName || selectedFile.name,
      fileFormat: uploadResult.metadata?.fileFormat || 'pdf',
      fileSize: uploadResult.metadata?.fileSize || selectedFile.size,
      pageCount: uploadResult.metadata?.pageCount || 0,
      content: '', // 内容不传给前端，只保存元数据
      metadata: {
        ...metadata,
        tableOfContents: []
      }
    };

    // 元数据已确认，通知父组件刷新列表并跳转到浏览页面
    onMetadataConfirmed();
    setShowEditor(false);

    // 重置表单
    setTimeout(() => {
      setSuccess(false);
      setSelectedFile(null);
      setUploadResult(null);
      resetProgress();
    }, 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">上传电子书</h3>
      </div>

      <div className="space-y-4">
        {/* 文件选择区域 */}
        <label
          htmlFor="book-upload"
          className={`
            flex flex-col items-center justify-center
            border-2 border-dashed rounded-lg p-8
            cursor-pointer transition-all
            ${isUploading ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'}
          `}
        >
          <Upload className="w-12 h-12 text-blue-600 mb-3" />
          <p className="text-sm text-gray-700 font-medium">
            点击选择文件或拖拽到此处
          </p>
          <p className="text-xs text-gray-500 mt-1">
            支持 PDF、EPUB、TXT 格式，最大 100MB
          </p>
          <input
            id="book-upload"
            type="file"
            accept=".pdf,.epub,.txt"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>

        {/* 上传进度 */}
        {uploadProgress && (
          <UploadProgressBar
            progress={uploadProgress}
            fileName={selectedFile?.name || ''}
          />
        )}

        {/* 成功提示 - 移除，直接显示编辑器 */}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        {/* 使用说明 */}
        <div className="text-xs text-gray-500 space-y-1 mt-6">
          <p className="font-medium text-gray-700">上传说明：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>系统将自动提取书籍元数据（书名、作者、学科等）</li>
            <li>AI 会智能识别章节目录结构</li>
            <li>您可以在上传后手动编辑所有信息</li>
            <li>书籍内容将保存在本地，不会上传到服务器</li>
          </ul>
        </div>
      </div>

      {/* 图书元数据确认态框 */}
      {showEditor && uploadResult?.metadata && (
        <BookMetadataModal
          fileName={uploadResult.metadata.fileName || selectedFile?.name || ''}
          initialMetadata={{
            title: uploadResult.metadata.title || '',
            author: uploadResult.metadata.author || '',
            subject: uploadResult.metadata.subject || '',
            grade: uploadResult.metadata.grade || '',
            category: uploadResult.metadata.category || '',
            publisher: uploadResult.metadata.publisher || '',
            publishDate: uploadResult.metadata.publishDate || '',
            notes: uploadResult.metadata.notes || ''
          }}
          confidence={uploadResult.confidence || { overall: 0, fields: {} }}
          onSave={(metadata) => {
            handleSaveMetadata({
              ...uploadResult.metadata,
              ...metadata
            });
          }}
          onCancel={() => {
            setShowEditor(false);
            setUploadResult(null);
            setSelectedFile(null);
            resetProgress();
          }}
        />
      )}
    </div>
  );
};
