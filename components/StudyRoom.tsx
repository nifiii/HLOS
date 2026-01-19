import React, { useState, useMemo } from 'react';
import { GraduationCap, BookOpen, FileText, ClipboardCheck } from 'lucide-react';
import { UserProfile, EBook, ChapterNode, ScannedItem } from '../types';
import { ChapterSelector } from './ChapterSelector';
import { CoursewareGenerator } from './CoursewareGenerator';
import { QuizGenerator } from './QuizGenerator';

interface StudyRoomProps {
  currentUser: UserProfile;
  books: EBook[];
  wrongProblems: ScannedItem[];
}

type StudyStep = 'select' | 'courseware' | 'quiz';

const StudyRoom: React.FC<StudyRoomProps> = ({ currentUser, books, wrongProblems }) => {
  const [currentStep, setCurrentStep] = useState<StudyStep>('select');
  const [selectedBook, setSelectedBook] = useState<EBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterNode | null>(null);
  const [coursewareContent, setCoursewareContent] = useState<string>('');

  // 过滤出当前章节相关的错题
  const relevantWrongProblems = useMemo(() => {
    if (!selectedBook || !selectedChapter) return [];

    return wrongProblems.filter((item) => {
      // 简单匹配：学科相同
      return item.meta.subject === selectedBook.subject;
      // TODO: 更精细的匹配逻辑（根据章节标题、知识点等）
    });
  }, [selectedBook, selectedChapter, wrongProblems]);

  // 处理章节选择
  const handleChapterSelect = (book: EBook, chapter: ChapterNode) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setCurrentStep('courseware');
  };

  // 返回章节选择
  const handleBackToSelect = () => {
    setCurrentStep('select');
    setSelectedBook(null);
    setSelectedChapter(null);
    setCoursewareContent('');
  };

  // 跳转到测验生成
  const handleGotoQuiz = (courseware: string) => {
    setCoursewareContent(courseware);
    setCurrentStep('quiz');
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: 'select', label: '选择章节', icon: BookOpen },
      { key: 'courseware', label: '生成课件', icon: FileText },
      { key: 'quiz', label: '配套测验', icon: ClipboardCheck },
    ];

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted =
            (step.key === 'select' && selectedChapter) ||
            (step.key === 'courseware' && coursewareContent);

          return (
            <React.Fragment key={step.key}>
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-300"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 顶部标题 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-10 h-10" />
              <h2 className="text-3xl font-bold">AI 学习园地</h2>
            </div>
            <p className="text-blue-100 text-sm">
              为 {currentUser.name} 定制的个性化学习内容
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100 mb-1">当前年级</div>
            <div className="text-2xl font-bold">{currentUser.grade}</div>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      {renderStepIndicator()}

      {/* 内容区域 */}
      {currentStep === 'select' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              第一步：选择学习内容
            </h3>
            <p className="text-sm text-gray-600">
              从您的图书馆中选择一本教材和具体章节，开始生成个性化学习内容
            </p>
          </div>
          <ChapterSelector
            books={books}
            onSelect={handleChapterSelect}
          />
        </div>
      )}

      {currentStep === 'courseware' && selectedBook && selectedChapter && (
        <div>
          <CoursewareGenerator
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            wrongProblems={relevantWrongProblems}
            onBack={handleBackToSelect}
          />

          {/* 继续下一步按钮（课件生成后显示） */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setCurrentStep('quiz')}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg"
            >
              <ClipboardCheck className="w-5 h-5" />
              继续生成配套测验
            </button>
          </div>
        </div>
      )}

      {currentStep === 'quiz' && selectedBook && selectedChapter && (
        <div>
          <QuizGenerator
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            wrongProblems={relevantWrongProblems}
            coursewareContent={coursewareContent}
          />

          {/* 完成按钮 */}
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handleBackToSelect}
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              返回首页
            </button>
            <button
              onClick={() => setCurrentStep('courseware')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              返回课件
            </button>
          </div>
        </div>
      )}

      {/* 提示信息（选择步骤且无图书时） */}
      {currentStep === 'select' && books.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">您的图书馆还没有教材</p>
          <p className="text-sm text-gray-500">
            请先前往「图书馆」上传您的电子教材
          </p>
        </div>
      )}
    </div>
  );
};

export default StudyRoom;
