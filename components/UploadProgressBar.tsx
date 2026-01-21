import React from 'react';
import { UploadProgress } from '../types';

export interface UploadProgressBarProps {
  progress: UploadProgress;
  fileName: string;
}

const UploadProgressBar: React.FC<UploadProgressBarProps> = ({ progress, fileName }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-slate-200">
      {/* 文件名 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-brand-100 text-brand-500 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{fileName}</h3>
            <p className="text-xs text-slate-500">
              正在上传 {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-brand-500">{progress.percentage}%</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>分片 {progress.chunkIndex + 1} / {progress.totalChunks}</span>
          <span>总计 {progress.totalChunks} 个分片</span>
        </div>
      </div>

      {/* 状态提示 */}
      {progress.percentage < 100 && (
        <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>正在上传第 {progress.chunkIndex + 1} 个分片...</span>
        </div>
      )}

      {progress.percentage === 100 && (
        <div className="flex items-center space-x-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
          <i className="fa-solid fa-check-circle"></i>
          <span>上传完成，正在处理文件...</span>
        </div>
      )}
    </div>
  );
};

export default UploadProgressBar;
