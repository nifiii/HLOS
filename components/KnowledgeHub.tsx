
import React, { useState } from 'react';
import { ScannedItem, UserProfile, DocType, KnowledgeStatus } from '../types';

const KnowledgeHub: React.FC<{ items: ScannedItem[], currentUser: UserProfile }> = ({ items, currentUser }) => {
  const [filterStatus, setFilterStatus] = useState<KnowledgeStatus | 'all'>('all');

  const filteredItems = filterStatus === 'all' ? items : items.filter(i => i.meta.knowledge_status === filterStatus);

  const statusIcons = {
    [KnowledgeStatus.MASTERED]: 'fa-circle-check text-emerald-500',
    [KnowledgeStatus.UNMASTERED]: 'fa-circle-xmark text-red-500',
    [KnowledgeStatus.STRENGTHEN]: 'fa-circle-exclamation text-amber-500',
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-black text-slate-800">Obsidian 知识档案库</h2>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
             Root: {currentUser.name}/Vault
           </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
           {Object.values(KnowledgeStatus).map(status => (
             <button 
               key={status}
               onClick={() => setFilterStatus(status)}
               className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${filterStatus === status ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {status.replace('的知识', '')}
             </button>
           ))}
           <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${filterStatus === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>全部</button>
        </div>
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
