import React from 'react';
import { UserProfile } from '../types';
import { Home, Camera, BookOpen, Library, GraduationCap, FileText, Mic, LucideIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '概览', icon: Home, color: '#4A90E2' },
  { id: 'library_hub', label: '图书馆', icon: Library, color: '#A78BFA' },
  { id: 'capture', label: '拍题', icon: Camera, color: '#5FD4A0' },
  { id: 'tutor', label: 'AI 导师', icon: Mic, color: '#FB7185' },
  { id: 'study_room', label: '自习室', icon: GraduationCap, color: '#10B981' },
  { id: 'vault', label: '档案库', icon: FileText, color: '#FFB84D' },
];

// 移动端主要入口（前5个）
const mobileNavItems = navItems.slice(0, 5);

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  currentUser,
  availableUsers,
  onSwitchUser
}) => {
  return (
    <div className="h-screen w-screen bg-gradient-to-b from-gray-50 to-paper flex flex-col overflow-hidden">
      {/* 顶部导航栏（所有设备） */}
      <header className="fixed top-0 w-full h-16 backdrop-blur-md bg-white/80 border-b border-gray-200 z-50 transition-shadow">
        <div className="h-full px-4 md:px-6 flex items-center justify-between max-w-7xl mx-auto">
          {/* 左侧：Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onTabChange('dashboard')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-mint-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              智
            </div>
            <span className="text-lg font-semibold text-gray-800 hidden sm:block">智学 OS</span>
          </div>

          {/* 中间：页面标题（仅移动端） */}
          <h1 className="md:hidden font-medium text-gray-700">
            {navItems.find(item => item.id === activeTab)?.label || '智学 OS'}
          </h1>

          {/* 右侧：用户切换 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const nextIndex = (availableUsers.findIndex(u => u.id === currentUser.id) + 1) % availableUsers.length;
                onSwitchUser(availableUsers[nextIndex].id);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-mint-400 flex items-center justify-center text-white font-medium text-sm">
                {currentUser.name[0]}
              </div>
              <span className="font-medium text-gray-700 hidden sm:block">{currentUser.name}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 侧边栏导航（桌面端） */}
      <nav className="hidden md:block fixed left-0 top-16 w-70 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto z-40">
        <div className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-sky-50 border-l-4 border-sky-500 font-medium text-sky-700'
                    : 'hover:bg-gray-50 text-gray-700'
                  }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: isActive ? item.color + '30' : item.color + '20',
                    color: item.color
                  }}
                >
                  <Icon size={20} />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 底部导航栏（移动端） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-18 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-full px-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-0 flex-1"
              >
                <Icon
                  size={24}
                  className={`transition-all duration-200 ${
                    isActive ? 'scale-120' : 'scale-100'
                  }`}
                  style={{ color: isActive ? item.color : '#9CA3AF' }}
                />
                <span
                  className={`text-xs transition-all duration-200 truncate max-w-full ${
                    isActive ? 'font-semibold' : 'font-normal'
                  }`}
                  style={{ color: isActive ? item.color : '#9CA3AF' }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="pt-16 pb-20 md:pb-8 md:pl-70 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
