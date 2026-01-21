import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { EBook, IndexStatus } from '../types';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import UploadProgressBar from './UploadProgressBar';

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
  };
}

interface BookUploaderProps {
  onUploadSuccess: (uploadResult: UploadResult) => void;
  ownerId: string;
}

export const BookUploader: React.FC<BookUploaderProps> = ({ onUploadSuccess, ownerId }) => {
  const { uploadProgress, isUploading, uploadFile, resetProgress } = useChunkedUpload();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    // 使用分片上传
    const result = await uploadFile(file, ownerId, '/api/upload-chunk');

    if (result.success) {
      setSuccess(true);

      // 通知父组件 - 分片上传完成后，需要从服务器获取完整的数据
      // 这里暂时使用文件名作为基本信息，实际数据会在后端处理完成后返回
      const uploadResult: UploadResult = {
        fileName: file.name,
        fileFormat: file.type.split('/')[1] as 'pdf' | 'epub' | 'txt',
        fileSize: file.size,
        pageCount: 0, // 会在后端解析后更新
        content: '', // 会在后端解析后更新
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ''),
          subject: '',
          category: '',
          grade: '',
          tags: [],
          tableOfContents: []
        }
      };

      onUploadSuccess(uploadResult);

      // 重置表单
      setTimeout(() => {
        setSuccess(false);
        setSelectedFile(null);
        resetProgress();
        event.target.value = '';
      }, 2000);
    } else {
      setError(result.error || '上传失败，请重试');
    }
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

        {/* 成功提示 */}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">上传成功！正在跳转到编辑页面...</span>
          </div>
        )}

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
    </div>
  );
};
