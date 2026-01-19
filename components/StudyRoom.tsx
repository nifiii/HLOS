
import React, { useState } from 'react';
import { generateCourseware, generateAssessment } from '../services/geminiService';
import { UserProfile, KnowledgeStatus } from '../types';

const StudyRoom: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [selectedBook, setSelectedBook] = useState('小学数学（人教版）');
  const [selectedChapter, setSelectedChapter] = useState('第一章：认识图形');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);

  const handleAction = async (type: 'course' | 'test') => {
    setLoading(true);
    try {
      const res = type === 'course' 
        ? await generateCourseware(selectedBook, selectedChapter, currentUser.name)
        : await generateAssessment({ type: 'unit', chapter: selectedChapter }, [], currentUser.name);
      setContent(res);
    } catch (e) {
      alert("操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10">
            <i className="fa-solid fa-graduation-cap text-9xl"></i>
         </div>
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
               <h2 className="text-3xl font-black tracking-tight">智能自习室</h2>
               <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                     <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">当前指定教材</label>
                     <select 
                       value={selectedBook} 
                       onChange={(e) => setSelectedBook(e.target.value)}
                       className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                     >
                        <option value="小学数学（人教版）">小学数学（人教版）</option>
                        <option value="初中英语阅读精选">初中英语阅读精选</option>
                     </select>
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                     <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">当前学习进度</label>
                     <select 
                       value={selectedChapter}
                       onChange={(e) => setSelectedChapter(e.target.value)}
                       className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                     >
                        <option value="第一章：认识图形">第一章：认识图形</option>
                        <option value="第二章：10以内加减法">第二章：10以内加减法</option>
                     </select>
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <button onClick={() => handleAction('course')} className="bg-brand-500 hover:bg-brand-600 px-8 py-3 rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95">
                 <i className="fa-solid fa-wand-sparkles mr-2"></i> 生成教学课件
               </button>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleAction('test')} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-[10px] font-bold transition-all">单元测试</button>
                  <button onClick={() => handleAction('test')} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-[10px] font-bold transition-all">模拟测试</button>
               </div>
            </div>
         </div>
      </div>

      {loading && (
        <div className="py-20 text-center animate-pulse">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-brand-500 mb-4"></i>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">AnythingLLM 正在快速索引教材内容...</p>
        </div>
      )}

      {content && !loading && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 md:p-12 animate-slide-up">
           <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
              <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full uppercase tracking-widest">
                Generated Courseware / Assessment
              </span>
              <button 
                onClick={() => alert(`已按照分级策略同步至 Obsidian: ${currentUser.name}/2026-01/Math/Courses/`)}
                className="text-slate-400 hover:text-brand-500 transition-colors flex items-center text-xs font-bold"
              >
                <i className="fa-solid fa-share-nodes mr-2"></i> 存档至 Obsidian Vault
              </button>
           </div>
           <div className="prose prose-slate max-w-none whitespace-pre-wrap font-medium text-slate-700 leading-relaxed">
             {content}
           </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoom;
