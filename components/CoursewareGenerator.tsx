import React, { useState } from 'react';
import { FileText, Sparkles, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { EBook, ChapterNode, ScannedItem } from '../types';
import ReactMarkdown from 'react-markdown';

interface CoursewareGeneratorProps {
  selectedBook: EBook;
  selectedChapter: ChapterNode;
  wrongProblems: ScannedItem[]; // 用于 RAG 上下文
  onBack: () => void;
}

type TeachingStyle = 'rigorous' | 'storytelling' | 'practice' | 'exploration';

interface StyleOption {
  value: TeachingStyle;
  label: string;
  description: string;
  icon: string;
}

const TEACHING_STYLES: StyleOption[] = [
  {
    value: 'rigorous',
    label: '严谨讲解',
    description: '系统完整，逻辑严密，适合理科学习',
    icon: '📐',
  },
  {
    value: 'storytelling',
    label: '故事化',
    description: '生动形象，趣味性强，易于理解',
    icon: '📚',
  },
  {
    value: 'practice',
    label: '实践导向',
    description: '大量例题，边学边练，巩固知识',
    icon: '✏️',
  },
  {
    value: 'exploration',
    label: '探究式',
    description: '启发思考，培养探索精神',
    icon: '🔍',
  },
];

export const CoursewareGenerator: React.FC<CoursewareGeneratorProps> = ({
  selectedBook,
  selectedChapter,
  wrongProblems,
  onBack,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<TeachingStyle>('rigorous');
  const [generating, setGenerating] = useState(false);
  const [courseware, setCourseware] = useState<string>('');
  const [error, setError] = useState<string>('');

  // 生成课件
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError('');
      setCourseware('');

      const response = await fetch('/api/generate-courseware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: selectedBook.title,
          subject: selectedBook.subject,
          chapterTitle: selectedChapter.title,
          teachingStyle: selectedStyle,
          wrongProblems: wrongProblems.slice(0, 10), // 最多传递10个错题
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }

      setCourseware(result.data.markdown);
    } catch (err) {
      console.error('生成课件失败:', err);
      const message = err instanceof Error ? err.message : '生成失败，请重试';
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  // 下载课件
  const handleDownload = () => {
    const blob = new Blob([courseware], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBook.title}-${selectedChapter.title}-课件.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 顶部信息栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium mb-4 text-sm"
        >
          ← 返回选择章节
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {selectedChapter.title}
            </h3>
            <p className="text-sm text-gray-600">
              《{selectedBook.title}》- {selectedBook.subject} - {selectedBook.grade}
            </p>
          </div>
        </div>
      </div>

      {/* 教学风格选择 */}
      {!courseware && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            选择教学风格
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {TEACHING_STYLES.map((style) => (
              <button
                key={style.value}
                onClick={() => setSelectedStyle(style.value)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedStyle === style.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{style.icon}</span>
                  <div>
                    <h5 className="font-semibold text-gray-800 mb-1">{style.label}</h5>
                    <p className="text-xs text-gray-600">{style.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                正在生成课件...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                生成个性化课件
              </>
            )}
          </button>

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* 提示信息 */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>智能提示：</strong>
              {wrongProblems.length > 0
                ? `系统已检测到您有 ${wrongProblems.length} 道该章节的错题，将针对性加强讲解相关知识点。`
                : '暂无该章节的错题记录，将按标准教学内容生成课件。'}
            </p>
          </div>
        </div>
      )}

      {/* 课件展示 */}
      {courseware && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-800">课件生成成功</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                下载 Markdown
              </button>
              <button
                onClick={() => setCourseware('')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                重新生成
              </button>
            </div>
          </div>

          <div className="p-6 prose prose-slate max-w-none overflow-y-auto max-h-[600px]">
            <ReactMarkdown>{courseware}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
