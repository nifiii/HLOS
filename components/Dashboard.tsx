import React from 'react';
import { ScannedItem, DocType, UserProfile } from '../types';
import { Card, CardHeader, Badge, Button } from './ui';
import { TrendingUp, Calendar, Clock, Award, Target, BookOpen, Camera, Library, GraduationCap, FileText, AlertCircle } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { TrendChart } from './TrendChart';

interface DashboardProps {
  items: ScannedItem[];
  currentUser: UserProfile;
  onTabChange: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ items, currentUser, onTabChange }) => {
  // 使用实时统计 Hook
  const stats = useDashboardStats(items);

  const recentActivities = items.slice(0, 5).map(item => ({
    time: new Date(item.timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    title: item.meta.type === DocType.WRONG_PROBLEM ? '错题录入' :
           item.meta.type === DocType.NOTE ? '笔记记录' : '教材学习',
    description: `${item.meta.subject} · ${item.meta.problems?.length || 0}个问题`,
    color: item.meta.type === DocType.WRONG_PROBLEM ? '#FB7185' :
           item.meta.type === DocType.NOTE ? '#A78BFA' : '#10B981',
  }));

  const shortcuts = [
    {
      id: 'capture',
      label: '拍题录入',
      description: '快速拍摄错题',
      icon: Camera,
      color: '#5FD4A0'
    },
    {
      id: 'library_hub',
      label: '图书管理',
      description: '上传新教材',
      icon: Library,
      color: '#A78BFA'
    },
    {
      id: 'study_room',
      label: '开始学习',
      description: '生成课件',
      icon: GraduationCap,
      color: '#4A90E2'
    },
    {
      id: 'vault',
      label: '智能组卷',
      description: '针对性练习',
      icon: FileText,
      color: '#FFB84D'
    },
  ];

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

      {/* 4个统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card hover className="p-6">
          <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center bg-blue-100">
            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.todayCount}</div>
          <div className="text-sm text-gray-600 mb-2">今日收录</div>
          {stats.todayCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-500">
              <TrendingUp size={14} />
              <span>新增</span>
            </div>
          )}
        </Card>

        <Card hover className="p-6">
          <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center bg-green-100">
            <Calendar className="w-6 h-6 text-green-500" />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.weekCount}</div>
          <div className="text-sm text-gray-600 mb-2">本周收录</div>
          <div className="flex items-center gap-1 text-xs text-green-500">
            <TrendingUp size={14} />
            <span>7天</span>
          </div>
        </Card>

        <Card hover className="p-6">
          <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center bg-red-100">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalWrong}</div>
          <div className="text-sm text-gray-600 mb-2">待复习（错题）</div>
        </Card>

        <Card hover className="p-6">
          <div
            className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
            style={{
              backgroundColor: stats.masteryRate >= 80 ? '#10B98120' :
                             stats.masteryRate >= 60 ? '#FFB84D20' : '#EF444420'
            }}
          >
            <Target
              className="w-6 h-6"
              style={{
                color: stats.masteryRate >= 80 ? '#10B981' :
                       stats.masteryRate >= 60 ? '#F59E0B' : '#EF4444'
              }}
            />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.masteryRate}%</div>
          <div className="text-sm text-gray-600 mb-2">掌握率</div>
          <div className={`flex items-center gap-1 text-xs ${
            stats.masteryRate >= 80 ? 'text-green-500' :
            stats.masteryRate >= 60 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            <TrendingUp
              size={14}
              className={stats.masteryRate < 60 ? 'rotate-180' : ''}
            />
            <span>{stats.masteryRate >= 80 ? '优秀' : stats.masteryRate >= 60 ? '良好' : '需努力'}</span>
          </div>
        </Card>
      </div>

      {/* 最近7天学习趋势 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">最近7天学习趋势</h3>
            <p className="text-sm text-gray-500">每日收录数量</p>
          </div>
        </div>
        <TrendChart data={stats.last7Days} />
      </Card>

      {/* 最近学习 */}
      <Card>
        <CardHeader title="最近学习" icon={<Clock size={20} />} />

        {recentActivities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <p>还没有学习记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex gap-4">
                {/* 时间轴圆点 */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activity.color }}
                  />
                  {index < recentActivities.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 pb-4">
                  <div className="text-sm text-gray-500 mb-1">{activity.time}</div>
                  <div className="font-medium mb-1">{activity.title}</div>
                  <div className="text-sm text-gray-600">{activity.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 快捷入口 */}
      <Card>
        <CardHeader title="快捷入口" icon={<Target size={20} />} />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="p-6 rounded-xl border-2 border-gray-100 hover:border-sky-300 hover:bg-sky-50 transition-all duration-300 group text-left"
              >
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform"
                  style={{ backgroundColor: item.color + '20' }}
                >
                  <Icon style={{ color: item.color }} size={32} />
                </div>
                <div className="font-medium mb-1 text-center">{item.label}</div>
                <div className="text-xs text-gray-500 text-center">{item.description}</div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;