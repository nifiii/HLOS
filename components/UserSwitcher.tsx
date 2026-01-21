import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';

interface UserSwitcherProps {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onUserSwitch: (userId: string) => void;
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({
  currentUser,
  availableUsers,
  onUserSwitch
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = (userId: string) => {
    if (userId !== currentUser.id) {
      onUserSwitch(userId);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 快速切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all duration-200 cursor-pointer shadow-sm"
        style={{ height: '40px' }}
      >
        {/* 用户头像 */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-mint-400 flex items-center justify-center text-white font-medium text-sm">
          {currentUser.avatar}
        </div>

        {/* 切换文字 */}
        <span className="text-sm font-bold text-gray-700">
          切换到：{currentUser.name}
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="max-h-80 overflow-y-auto py-1">
            {availableUsers.map((user) => {
              const isCurrent = user.id === currentUser.id;

              return (
                <button
                  key={user.id}
                  onClick={() => handleSwitch(user.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors duration-150 ${
                    isCurrent
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ height: '48px' }}
                >
                  {/* 用户头像 */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-mint-400 flex items-center justify-center text-white font-medium text-base flex-shrink-0">
                    {user.avatar}
                  </div>

                  {/* 用户信息 */}
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {user.name}
                      </span>
                      {/* 当前用户对勾标记 */}
                      {isCurrent && (
                        <span className="text-sky-600 text-xs">✓</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 truncate">
                      {user.grade}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSwitcher;
