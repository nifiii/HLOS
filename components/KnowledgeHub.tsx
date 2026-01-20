
import React, { useState } from 'react';
import { ScannedItem, UserProfile, DocType, KnowledgeStatus } from '../types';
import { Card, Badge } from './ui';
import { Calendar, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const KnowledgeHub: React.FC<{ items: ScannedItem[], currentUser: UserProfile }> = ({ items, currentUser }) => {
  const [filterStatus, setFilterStatus] = useState<KnowledgeStatus | 'all'>('all');

  const filteredItems = filterStatus === 'all' ? items : items.filter(i => i.meta.knowledge_status === filterStatus);

  const statusIcons = {
    [KnowledgeStatus.MASTERED]: 'fa-circle-check text-emerald-500',
    [KnowledgeStatus.UNMASTERED]: 'fa-circle-xmark text-red-500',
    [KnowledgeStatus.STRENGTHEN]: 'fa-circle-exclamation text-amber-500',
  };

  const [currentFilter, setCurrentFilter] = useState('全部');

  const filterOptions = ['全部', '错题', '笔记', '教材'];

  const filterMap: Record<string, DocType | null> = {
    '全部': null,
    '错题': DocType.WRONG_PROBLEM,
    '笔记': DocType.NOTE,
    '教材': DocType.TEXTBOOK,
  };

  const displayItems = currentFilter === '全部'
    ? items
    : items.filter(item => item.meta.type === filterMap[currentFilter]);

  return (
    <div className="space-y-6">
      {/* 筛选栏 */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            onClick={() => setCurrentFilter(filter)}
            className={`px-6 py-2 rounded-full whitespace-nowrap transition-all duration-200
              ${currentFilter === filter
                ? 'bg-sky-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto large-scrollbar pr-2">
         {filteredItems.map(item => (
           <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all p-5 flex flex-col group">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center space-x-2">
                    <i className={`fa-solid ${statusIcons[item.meta.knowledge_status || KnowledgeStatus.STRENGTHEN]} text-xs`}></i>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                       {item.meta.subject} / {item.meta.type}
                    </span>
                 </div>
                 <span className="text-[8px] font-bold text-slate-300">{new Date(item.timestamp).toLocaleDateString()}</span>
              </div>
              
              <div className="flex-1 bg-slate-50 rounded-2xl p-4 mb-4 font-mono text-[10px] text-slate-500 leading-relaxed overflow-hidden border border-slate-100">
                 <div className="text-brand-500 font-bold mb-2">--- (Frontmatter) ---</div>
                 <div>status: {item.meta.knowledge_status}</div>
                 <div>category: {item.meta.type}</div>
                 <div>path: {currentUser.name}/2026-01/{item.meta.subject}/...</div>
                 <div className="mt-2 text-slate-800 opacity-60 line-clamp-3">{item.rawMarkdown}</div>
              </div>

              <div className="flex items-center justify-between pt-2">
                 <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] shadow-sm"><i className="fa-solid fa-file-pdf text-red-500"></i></div>
                    <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] shadow-sm"><i className="fa-solid fa-file-lines text-slate-400"></i></div>
                 </div>
                 <button className="text-brand-500 hover:text-brand-600 transition-colors">
                    <i className="fa-solid fa-up-right-from-square text-sm"></i>
                 </button>
              </div>
           </div>
         ))}
         {filteredItems.length === 0 && (
           <div className="col-span-full h-full flex flex-col items-center justify-center opacity-20 py-20">
              <i className="fa-solid fa-inbox text-6xl mb-4"></i>
              <p className="font-black uppercase tracking-widest">该分类下暂无数据</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default KnowledgeHub;
