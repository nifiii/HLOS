import React, { useState } from 'react';
import { FileText, Sparkles, Download, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateAssessment } from '../services/geminiService';
import { ExamRequest, ExamPaper, ScannedItem, UserProfile } from '../types';
import { Button, Card, Input, LoadingSpinner } from './ui';

interface ExamCenterProps {
  scannedItems: ScannedItem[];
  currentUser: UserProfile;
}

const ExamCenter: React.FC<ExamCenterProps> = ({ scannedItems, currentUser }) => {
  const [exams, setExams] = useState<ExamPaper[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  // Added missing 'type' property to match ExamRequest interface
  const [request, setRequest] = useState<ExamRequest>({
    subject: '数学',
    chapter: '',
    difficulty: 'medium',
    type: 'unit'
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const relevantContext = scannedItems
        .filter(item => item.meta.subject?.includes(request.subject) || true)
        .map(item => item.rawMarkdown.substring(0, 500));

      // Fixed: Passing 3 arguments instead of 4 to match generateAssessment(request, contextItems, studentName) signature
      const generatedContent = await generateAssessment(
          { ...request, chapter: request.chapter || '综合复习' }, 
          relevantContext,
          currentUser.name
      );
      
      const newExam: ExamPaper = {
        id: Date.now().toString(),
        ownerId: currentUser.id,
        title: `${request.subject} 单元测试`,
        subject: request.subject,
        content: generatedContent,
        createdAt: Date.now()
      };

      setExams([newExam, ...exams]);

    } catch (e) {
      alert("试卷生成失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-card relative overflow-hidden">
        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 opacity-20 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="150" cy="50" r="40" fill="white" />
            <circle cx="100" cy="80" r="25" fill="white" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h2 className="text-2xl md:text-3xl font-bold">智能考场</h2>
          </div>
          <p className="text-purple-100 text-sm mb-6">
            针对 {currentUser.name} 的薄弱点生成个性化试卷
          </p>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-4">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-purple-100 uppercase mb-2">科目</label>
                <select
                  value={request.subject}
                  onChange={(e) => setRequest({...request, subject: e.target.value})}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  <option value="数学" className="text-gray-800">数学</option>
                  <option value="物理" className="text-gray-800">物理</option>
                  <option value="英语" className="text-gray-800">英语</option>
                  <option value="语文" className="text-gray-800">语文</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-purple-100 uppercase mb-2">复习重点</label>
                <input
                  type="text"
                  placeholder="例如：二次函数、力学"
                  value={request.chapter}
                  onChange={(e) => setRequest({...request, chapter: e.target.value})}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2.5 text-white placeholder-purple-200/50 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>

            {isGenerating ? (
              <div className="w-full py-3 bg-purple-900/30 rounded-lg">
                <LoadingSpinner size={24} text="命题推理中..." />
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-white text-purple-700 hover:bg-purple-50"
              >
                立即生成试卷
              </Button>
            )}
          </Card>
        </div>
      </div>

      <div className="space-y-4">
         <h3 className="font-bold text-gray-700 text-base">历史试卷归档</h3>
         {exams.length === 0 ? (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="flex flex-col items-center justify-center min-h-[50vh]"
           >
             <div className="relative w-80 h-80 mb-8">
               <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl opacity-50" />
               <div className="absolute inset-8 flex items-center justify-center">
                 <FileText size={120} className="text-purple-300" />
               </div>
             </div>
             <h2 className="text-2xl font-semibold mb-2">暂无试卷记录</h2>
             <p className="text-gray-600">请生成第一份个性化试卷</p>
           </motion.div>
         ) : (
           exams.map((exam, index) => (
             <motion.div
               key={exam.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: index * 0.1 }}
             >
               <Card className="p-4 md:p-6">
                 <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                   <div className="flex-1 min-w-0 mr-2">
                     <h4 className="font-bold text-lg text-gray-800 truncate">{exam.title}</h4>
                     <p className="text-xs text-gray-500 mt-1">
                       {new Date(exam.createdAt).toLocaleDateString('zh-CN')}
                     </p>
                   </div>
                   <Button
                     variant="outline"
                     size="sm"
                     icon={Download}
                   >
                     PDF
                   </Button>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs md:text-sm text-gray-700 whitespace-pre-wrap max-h-60 md:max-h-96 overflow-y-auto border border-gray-200">
                   {exam.content}
                 </div>
               </Card>
             </motion.div>
           ))
         )}
      </div>
    </div>
  );
};

export default ExamCenter;