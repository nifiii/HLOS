
import React, { useState } from 'react';
import { ScannedItem, UserProfile, DocType, KnowledgeStatus } from '../types';
import { Card, Badge } from './ui';
import { Calendar, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const KnowledgeHub: React.FC<{ items: ScannedItem[], currentUser: UserProfile }> = ({ items, currentUser }) => {
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

      {/* 知识卡片网格 */}
      {displayItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh]"
        >
          <div className="relative w-80 h-80 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl opacity-50" />
            <div className="absolute inset-8 flex items-center justify-center">
              <BookOpen size={120} className="text-gray-300" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2">知识库空空如也</h2>
          <p className="text-gray-600 mb-8">去拍题录入内容吧</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayItems.map((item, index) => {
            const subjectColors: Record<string, string> = {
              '数学': '#3B82F6',
              '语文': '#FB7185',
              '英语': '#A78BFA',
              '科学': '#10B981',
            };
            const color = subjectColors[item.meta.subject || '数学'] || '#4A90E2';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card hover onClick={() => {}}>
                  {/* 顶部彩色条 */}
                  <div className="h-2 -mx-6 -mt-6 mb-4 rounded-t-2xl" style={{ backgroundColor: color }} />

                  {/* 头部：学科标签 + 状态 */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="px-3 py-1 text-sm rounded-full font-medium"
                      style={{
                        backgroundColor: color + '20',
                        color: color,
                      }}
                    >
                      {item.meta.subject}
                    </span>
                    <Badge
                      variant={item.meta.knowledge_status === KnowledgeStatus.MASTERED ? 'success' : 'warning'}
                    >
                      {item.meta.knowledge_status === KnowledgeStatus.MASTERED ? '已掌握' : '待复习'}
                    </Badge>
                  </div>

                  {/* 内容预览 */}
                  <div className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                    {item.meta.problems?.[0]?.content || item.rawMarkdown || '暂无内容'}
                  </div>

                  {/* 底部：日期 + 章节提示 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(item.timestamp).toLocaleDateString('zh-CN')}
                    </span>
                    {item.meta.chapter_hint && (
                      <Badge size="sm" variant="default">{item.meta.chapter_hint}</Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KnowledgeHub;
