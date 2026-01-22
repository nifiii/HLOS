import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { EBook, IndexStatus } from '../types';
import { useChunkedUpload, ChunkedUploadResult } from '../hooks/useChunkedUpload';
import UploadProgressBar from './UploadProgressBar';
import BookEditor from './BookEditor';

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
  const [uploadResult, setUploadResult] = useState<ChunkedUploadResult | null>(null);
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
    const result = await uploadFile(file, ownerId, '/api/upload-chunk');

    if (result.success && result.filePath) {
      setSuccess(true);
      setUploadResult(result);

      // 合并成功后，调用 upload-book 接口解析图书
      console.log('✅ 分片上传完成，开始解析图书...');

      try {
        // 调用新的解析接口
        const parseResponse = await fetch('/api/upload-book/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: result.filePath,
            fileName: file.name,
            ownerId: ownerId
          }),
        });

        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          console.log('✅ 图书元数据提取成功:', parseData.data);

          // 更新 uploadResult，包含解析后的元数据
          setUploadResult({
            ...result,
            metadata: {
              ...parseData.data.metadata,
              fileName: parseData.data.fileName,
              fileFormat: parseData.data.fileFormat,
              fileSize: parseData.data.fileSize,
              pageCount: parseData.data.pageCount,
            }
          });

          // 显示编辑器
          setTimeout(() => {
            setShowEditor(true);
          }, 500);
        } else {
          throw new Error('解析失败');
        }
      } catch (error) {
        console.error('❌ 元数据提取失败，使用默认信息:', error);

        // 解析失败时使用默认元数据
        const defaultMetadata = {
          title: file.name.replace(/\.(pdf|epub|txt)$/i, ''),
          author: '',
          subject: '其他',
          grade: '',
          category: '教科书',
          publisher: '',
          publishDate: '',
          tags: [],
          coverImage: null
        };

        setUploadResult({
          ...result,
          metadata: defaultMetadata
        });

        // 仍然显示编辑器，让用户手动填写
        setTimeout(() => {
          setShowEditor(true);
        }, 500);
      }
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

    onUploadSuccess(finalResult);
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

        {/* 成功提示 */}
        {success && !showEditor && (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">上传成功！AI 正在分析图书信息...</span>
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

      {/* 图书信息编辑器 */}
      {showEditor && uploadResult?.metadata && (
        <BookEditor
          metadata={uploadResult.metadata}
          onSave={handleSaveMetadata}
          onCancel={() => setShowEditor(false)}
          userName={ownerId}  // 传递用户名作为默认标签
        />
      )}
    </div>
  );
};
