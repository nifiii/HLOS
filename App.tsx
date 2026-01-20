
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CaptureModule from './components/CaptureModule';
import KnowledgeHub from './components/KnowledgeHub';
import ExamCenter from './components/ExamCenter';
import LibraryHub from './components/LibraryHub';
import StudyRoom from './components/StudyRoom';
import LiveTutor from './components/LiveTutor';
import { ScannedItem, UserProfile, EBook } from './types';
import { getAllBooks } from './services/bookStorage';

const FAMILY_PROFILES: UserProfile[] = [
  { id: 'child_1', name: '大宝', avatar: '👦', grade: '高中二年级' },
  { id: 'child_2', name: '二宝', avatar: '👧', grade: '初中一年级' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile>(FAMILY_PROFILES[0]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [books, setBooks] = useState<EBook[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTutor, setShowTutor] = useState(false);

  // 加载图书数据
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const allBooks = await getAllBooks();
        setBooks(allBooks);
      } catch (error) {
        console.error('加载图书失败:', error);
      }
    };
    loadBooks();
  }, []);

  // 自动清除错误消息
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const filteredItems = useMemo(() => {
    return scannedItems.filter(item =>
      item.ownerId === currentUser.id || item.ownerId === 'shared'
    );
  }, [scannedItems, currentUser.id]);

  const filteredBooks = useMemo(() => {
    return books.filter(book =>
      book.ownerId === currentUser.id || book.ownerId === 'shared'
    );
  }, [books, currentUser.id]);

  const handleScanComplete = (item: ScannedItem) => {
    setScannedItems(prev => [item, ...prev]);
  };

  const handleUserSwitch = (userId: string) => {
    const user = FAMILY_PROFILES.find(u => u.id === userId);
    if (user) setCurrentUser(user);
  };

  // 全局错误提示 UI
  const ErrorToast = () => errorMsg ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-slide-up flex items-center space-x-3 border-2 border-red-400">
      <i className="fa-solid fa-triangle-exclamation"></i>
      <span className="font-bold text-sm">{errorMsg}</span>
      <button onClick={() => setErrorMsg(null)} className="ml-2 opacity-70 hover:opacity-100">
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  ) : null;

  // 页面切换动画配置
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.3
  };

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard items={filteredItems} currentUser={currentUser} onTabChange={setActiveTab} />;
        case 'library_hub':
          return <LibraryHub currentUserId={currentUser.id} />;
        case 'capture':
          return <CaptureModule onScanComplete={handleScanComplete} currentUser={currentUser} />;
        case 'tutor':
          return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
               <div className="w-24 h-24 bg-brand-100 text-brand-500 rounded-full flex items-center justify-center text-4xl shadow-inner">
                  <i className="fa-solid fa-user-graduate"></i>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800">实时语音辅导</h3>
                  <p className="text-slate-500 max-w-sm mt-2 font-medium">与 Gemini 2.5 专家模型开启面对面语音交流，解决学习难题。</p>
               </div>
               <button
                onClick={() => setShowTutor(true)}
                className="bg-brand-500 hover:bg-brand-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95"
               >
                 启动实时导师
               </button>
            </div>
          );
        case 'study_room':
          return <StudyRoom currentUser={currentUser} books={filteredBooks} wrongProblems={filteredItems} />;
        case 'vault':
          return <KnowledgeHub items={filteredItems} currentUser={currentUser} />;
        case 'exams':
          return <ExamCenter scannedItems={filteredItems} currentUser={currentUser} />;
        default:
          return <Dashboard items={filteredItems} currentUser={currentUser} onTabChange={setActiveTab} />;
      }
    } catch (e: any) {
      setErrorMsg(e.message || "应用运行出错");
      return <Dashboard items={filteredItems} currentUser={currentUser} onTabChange={setActiveTab} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentUser={currentUser}
      availableUsers={FAMILY_PROFILES}
      onSwitchUser={handleUserSwitch}
    >
      <ErrorToast />
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      {showTutor && <LiveTutor currentUser={currentUser} onClose={() => setShowTutor(false)} />}
    </Layout>
  );
};

export default App;
