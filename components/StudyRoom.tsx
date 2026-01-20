import React, { useState, useMemo } from 'react';
import { GraduationCap, BookOpen, FileText, ClipboardCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile, EBook, ChapterNode, ScannedItem } from '../types';
import { ChapterSelector } from './ChapterSelector';
import { CoursewareGenerator } from './CoursewareGenerator';
import { QuizGenerator } from './QuizGenerator';
import { Button, Card } from './ui';

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
      <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted =
            (step.key === 'select' && selectedChapter) ||
            (step.key === 'courseware' && coursewareContent);

          return (
            <React.Fragment key={step.key}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-md'
                    : isCompleted
                    ? 'bg-mint-100 text-mint-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{step.label}</span>
              </motion.div>
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
      <div className="bg-gradient-to-r from-sky-400 to-mint-400 text-white rounded-3xl p-8 shadow-card relative overflow-hidden">
        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 opacity-20 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="150" cy="50" r="40" fill="white" />
            <circle cx="100" cy="80" r="25" fill="white" />
          </svg>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-10 h-10" />
              <h2 className="text-3xl font-bold">AI 学习园地</h2>
            </div>
            <p className="text-sky-50 text-sm">
              为 {currentUser.name} 定制的个性化学习内容
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-sky-100 mb-1">当前年级</div>
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
            studentName={currentUser.name} // 修复：传递学生姓名
            onBack={handleBackToSelect}
          />

          {/* 继续下一步按钮（课件生成后显示） */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="success"
              size="lg"
              icon={ClipboardCheck}
              onClick={() => setCurrentStep('quiz')}
              className="shadow-lg"
            >
              继续生成配套测验
            </Button>
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
          <div className="mt-6 flex justify-center gap-4 flex-wrap">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBackToSelect}
            >
              返回首页
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentStep('courseware')}
            >
              返回课件
            </Button>
          </div>
        </div>
      )}

      {/* 提示信息（选择步骤且无图书时） */}
      {currentStep === 'select' && books.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[50vh]"
        >
          <div className="relative w-80 h-80 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 to-mint-100 rounded-3xl opacity-50" />
            <div className="absolute inset-8 flex items-center justify-center">
              <BookOpen size={120} className="text-sky-300" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2">图书馆还没有教材</h2>
          <p className="text-gray-600 mb-4">
            请先前往「图书馆」上传您的电子教材
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default StudyRoom;
