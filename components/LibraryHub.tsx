
import React, { useState } from 'react';
import { EBook } from '../types';

const MOCK_BOOKS: EBook[] = [
  { id: 'b1', title: '小学数学（人教版）', author: '教育出版社', coverUrl: 'https://images.unsplash.com/photo-1543003968-24069e3dc3d5?w=400', subject: '数学', category: '教材', chapters: ['第一章：认识图形', '第二章：10以内加减法'], isPublic: true },
  { id: 'b2', title: '初中英语阅读精选', author: '外研社', coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', subject: '英语', category: '辅导', chapters: ['Unit 1: My School', 'Unit 2: Family Life'], isPublic: true },
];

const LibraryHub: React.FC = () => {
  const [books, setBooks] = useState<EBook[]>(MOCK_BOOKS);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = () => {
    setIsImporting(true);
    // 模拟 AnythingLLM 索引过程
    setTimeout(() => {
      alert("电子书籍已完成向量化索引。存储策略：EverythingLLM (Hot/可搜索)");
      setIsImporting(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">公共图书馆</h2>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">分门别类 • 共享资源</p>
        </div>
        <button 
          onClick={handleImport}
          className="bg-brand-500 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg hover:bg-brand-600 transition-all flex items-center"
        >
          {isImporting ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-file-import mr-2"></i>}
          导入电子版本教材 (PDF/EPUB)
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {books.map(book => (
          <div key={book.id} className="group cursor-pointer">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all relative border border-slate-100">
               <img src={book.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={book.title} />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-black/60 px-2 py-1 rounded">
                    AnythingLLM Indexed
                  </span>
               </div>
               <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur rounded-lg text-[8px] font-black shadow-sm">
                  {book.subject}
               </div>
            </div>
            <h4 className="mt-3 text-xs font-black text-slate-800 line-clamp-1">{book.title}</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{book.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LibraryHub;
