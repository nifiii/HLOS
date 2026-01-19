
import React from 'react';
import { UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  currentUser, 
  availableUsers,
  onSwitchUser 
}) => {
  const navItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: '看板' },
    { id: 'library_hub', icon: 'fa-book-atlas', label: '图书馆' },
    { id: 'capture', icon: 'fa-camera', label: '拍题' },
    { id: 'tutor', icon: 'fa-user-graduate', label: 'AI 导师' }, // Added Tutor Tab
    { id: 'study_room', icon: 'fa-laptop-code', label: '自习室' },
    { id: 'vault', icon: 'fa-folder-tree', label: '档案库' },
  ];

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white pt-[env(safe-area-inset-top)] pb-2 px-4 shadow-md z-50 flex-shrink-0">
        <div className="flex justify-between items-center h-12">
          <h1 className="font-bold text-base flex items-center">
            <i className="fa-solid fa-brain mr-2 text-brand-500"></i> 
            <span>智学 OS</span>
          </h1>
          <button onClick={() => {
               const nextIndex = (availableUsers.findIndex(u => u.id === currentUser.id) + 1) % availableUsers.length;
               onSwitchUser(availableUsers[nextIndex].id);
             }} className="bg-slate-800 text-white rounded-full px-3 py-1 flex items-center text-xs border border-slate-700">
               {currentUser.avatar} <span className="ml-2">{currentUser.name}</span>
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-white h-full flex-shrink-0 shadow-2xl relative z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="font-black text-xl tracking-tight flex items-center">
            <i className="fa-solid fa-brain mr-3 text-brand-500 animate-pulse"></i>
            智学 OS
          </h1>
        </div>
        
        <div className="p-4 border-b border-slate-900">
          <div className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
             <span className="text-2xl">{currentUser.avatar}</span>
             <div className="min-w-0">
                <div className="font-black text-sm truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">{currentUser.grade}</div>
             </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center p-3.5 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id
                  ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-8 text-center text-lg`}></i>
              <span className="font-bold text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 bg-slate-900/30 border-t border-slate-900">
           <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-tighter">
             <span>Gemini Cloud Index</span>
             <span className="text-emerald-500">Live</span>
           </div>
           <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[92%]"></div>
           </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around p-2 z-50 safe-pb">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center p-2 rounded-xl w-full ${
              activeTab === item.id ? 'text-brand-500' : 'text-slate-400'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg mb-1`}></i>
            <span className="text-[9px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative w-full custom-scrollbar">
        <div className="p-4 pb-24 md:p-10 md:pb-10 max-w-7xl mx-auto min-h-full">
           {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
