import React, { useState } from 'react';
import { ClipboardCheck, Sparkles, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { EBook, ChapterNode, ScannedItem } from '../types';
import ReactMarkdown from 'react-markdown';

interface QuizGeneratorProps {
  selectedBook: EBook;
  selectedChapter: ChapterNode;
  wrongProblems: ScannedItem[];
  coursewareContent?: string; // 已生成的课件内容
}

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({
  selectedBook,
  selectedChapter,
  wrongProblems,
  coursewareContent,
}) => {
  const [generating, setGenerating] = useState(false);
  const [quiz, setQuiz] = useState<string>('');
  const [error, setError] = useState<string>('');

  // 生成测验
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError('');
      setQuiz('');

      const response = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: selectedBook.title,
          subject: selectedBook.subject,
          chapterTitle: selectedChapter.title,
          wrongProblems: wrongProblems.slice(0, 10),
          coursewareContent: coursewareContent || '', // 如果有课件内容，传递给 AI
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }

      setQuiz(result.data.markdown);
    } catch (err) {
      console.error('生成测验失败:', err);
      setError(err.message || '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  // 下载测验
  const handleDownload = () => {
    const blob = new Blob([quiz], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBook.title}-${selectedChapter.title}-测验.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-1">配套测验题</h3>
            <p className="text-sm text-gray-600">
              基于《{selectedBook.title}》- {selectedChapter.title}
            </p>
          </div>
        </div>
      </div>

      {/* 生成按钮和提示 */}
      {!quiz && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            {/* 说明 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>出题规则：</strong>
                根据本章节的知识点，每个知识点生成 <strong>2 道基础题 + 1 道提高题</strong>。
                {wrongProblems.length > 0 && (
                  <span className="block mt-2">
                    系统已检测到 {wrongProblems.length} 道错题，将针对性加强薄弱环节的考察。
                  </span>
                )}
              </p>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在生成测验题...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  生成配套测验
                </>
              )}
            </button>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 测验展示 */}
      {quiz && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-800">测验生成成功</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                下载 Markdown
              </button>
              <button
                onClick={() => setQuiz('')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                重新生成
              </button>
            </div>
          </div>

          <div className="p-6 prose prose-slate max-w-none overflow-y-auto max-h-[600px]">
            <ReactMarkdown>{quiz}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
