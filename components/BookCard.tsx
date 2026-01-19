import React from 'react';
import { BookOpen, User, Tag, GraduationCap, FileText, Trash2, Edit, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { EBook, IndexStatus } from '../types';

interface BookCardProps {
  book: EBook;
  onSelect: (book: EBook) => void;
  onEdit: (book: EBook) => void;
  onDelete: (bookId: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onSelect, onEdit, onDelete }) => {
  // 获取索引状态图标和文本
  const getIndexStatusInfo = (status: IndexStatus) => {
    switch (status) {
      case IndexStatus.INDEXED:
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: '已索引',
          color: 'text-green-600',
        };
      case IndexStatus.INDEXING:
        return {
          icon: <Clock className="w-4 h-4 text-blue-600 animate-spin" />,
          text: '索引中',
          color: 'text-blue-600',
        };
      case IndexStatus.FAILED:
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-600" />,
          text: '索引失败',
          color: 'text-red-600',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-gray-400" />,
          text: '待索引',
          color: 'text-gray-400',
        };
    }
  };

  const statusInfo = getIndexStatusInfo(book.indexStatus);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化日期
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden group"
      onClick={() => onSelect(book)}
    >
      {/* 封面区域 */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="w-16 h-16 text-white opacity-80" />
        )}

        {/* 索引状态标签 */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white rounded-full shadow-sm">
          {statusInfo.icon}
          <span className={`text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>

        {/* 文件格式标签 */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-50 text-white text-xs font-medium rounded uppercase">
          {book.fileFormat}
        </div>

        {/* 操作按钮（悬停显示） */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(book);
            }}
            className="p-2 bg-white rounded-full hover:bg-blue-50 transition-colors"
            title="编辑"
          >
            <Edit className="w-4 h-4 text-blue-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(book.id);
            }}
            className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-4 space-y-3">
        {/* 书名 */}
        <h4 className="font-semibold text-gray-800 line-clamp-2 min-h-[3rem]">
          {book.title}
        </h4>

        {/* 作者 */}
        {book.author && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span className="line-clamp-1">{book.author}</span>
          </div>
        )}

        {/* 学科、类别、年级 */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
            {book.subject}
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
            {book.category}
          </span>
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
            <GraduationCap className="w-3 h-3" />
            {book.grade}
          </span>
        </div>

        {/* 标签 */}
        {book.tags && book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {book.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
            {book.tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-500 text-xs">
                +{book.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 文件信息 */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {formatFileSize(book.fileSize)}
          </span>
          <span>{formatDate(book.uploadedAt)}</span>
        </div>
      </div>
    </div>
  );
};
