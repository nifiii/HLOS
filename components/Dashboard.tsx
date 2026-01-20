import React from 'react';
import { ScannedItem, DocType, UserProfile } from '../types';
import { Card, CardHeader, Badge, Button } from './ui';
import { TrendingUp, Calendar, Clock, Award, Target, BookOpen } from 'lucide-react';

interface DashboardProps {
  items: ScannedItem[];
  currentUser: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ items, currentUser }) => {
  const stats = {
    total: items.length,
    wrongProblems: items.filter(i => i.meta.type === DocType.WRONG_PROBLEM).length,
    notes: items.filter(i => i.meta.type === DocType.NOTE).length,
    textbooks: items.filter(i => i.meta.type === DocType.TEXTBOOK).length,
  };

  return (
    <div className="space-y-6">
      {/* 欢迎区 */}
      <section className="relative bg-gradient-to-r from-sky-400 to-mint-400 rounded-3xl p-8 text-white overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 opacity-20 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="50" r="40" fill="white" />
            <circle cx="150" cy="80" r="25" fill="white" />
            <circle cx="120" cy="100" r="15" fill="white" />
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            {new Date().getHours() < 12 ? '早安' : new Date().getHours() < 18 ? '下午好' : '晚上好'}，{currentUser.name}！
          </h1>
          <p className="text-white/90">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>

        {/* 右上角：今日学习进度 */}
        <div className="absolute top-8 right-8 hidden md:block">
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">75%</div>
              <div className="text-xs text-white/80">今日学习</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: '总收录', val: stats.total, color: 'bg-blue-500', icon: 'fa-layer-group' },
          { label: '错题本', val: stats.wrongProblems, color: 'bg-red-500', icon: 'fa-circle-xmark' },
          { label: '笔记数', val: stats.notes, color: 'bg-yellow-500', icon: 'fa-note-sticky' },
          { label: '教材资料', val: stats.textbooks, color: 'bg-green-500', icon: 'fa-book-open' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-800">{stat.val}</p>
            </div>
            <div className={`absolute right-[-10px] bottom-[-10px] md:relative md:right-0 md:bottom-0 w-16 h-16 md:w-12 md:h-12 rounded-full md:rounded-lg ${stat.color} text-white flex items-center justify-center opacity-20 md:opacity-90`}>
              <i className={`fa-solid ${stat.icon} text-3xl md:text-xl`}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 md:p-6 p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <i className="fa-solid fa-clock-rotate-left mr-2 text-brand-500"></i>
          最近活动
        </h3>
        
        {items.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <i className="fa-solid fa-box-open text-4xl mb-3 opacity-50"></i>
            <p className="text-sm">暂无数据，去拍个题吧！</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pl-2">类型</th>
                    <th className="pb-3">科目</th>
                    <th className="pb-3">章节/标签</th>
                    <th className="pb-3">时间</th>
                    <th className="pb-3 text-right">状态</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {items.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pl-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.meta.type === DocType.WRONG_PROBLEM ? 'bg-red-100 text-red-700' :
                          item.meta.type === DocType.TEXTBOOK ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.meta.type === DocType.WRONG_PROBLEM ? '错题' :
                           item.meta.type === DocType.TEXTBOOK ? '教材' :
                           item.meta.type === DocType.NOTE ? '笔记' :
                           item.meta.type === DocType.EXAM_PAPER ? '试卷' : '未知'}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-gray-800">{item.meta.subject || '通用'}</td>
                      <td className="py-3 text-gray-500">{item.meta.chapter_hint || '-'}</td>
                      <td className="py-3 text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</td>
                      <td className="py-3 text-right">
                        <span className="text-green-600 font-medium text-xs">
                          <i className="fa-solid fa-check mr-1"></i> 已归档
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-3 ${
                    item.meta.type === DocType.WRONG_PROBLEM ? 'bg-red-100 text-red-600' :
                    item.meta.type === DocType.TEXTBOOK ? 'bg-green-100 text-green-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <i className={`fa-solid ${
                      item.meta.type === DocType.WRONG_PROBLEM ? 'fa-xmark' :
                      item.meta.type === DocType.TEXTBOOK ? 'fa-book' :
                      'fa-file-lines'
                    }`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-800 text-sm truncate">{item.meta.subject}</h4>
                      <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{item.meta.chapter_hint || '未分类'}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;