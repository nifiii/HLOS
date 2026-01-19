import React, { useState } from 'react';
import { generateAssessment } from '../services/geminiService';
import { ExamRequest, ExamPaper, ScannedItem, UserProfile } from '../types';

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
    <div className="h-full space-y-6">
      <div className="bg-gradient-to-br from-purple-700 to-indigo-700 rounded-2xl p-5 md:p-6 text-white shadow-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-2 flex items-center">
            <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> 智能考场
        </h2>
        <p className="text-purple-100 text-xs md:text-sm mb-6 opacity-80">
            针对 {currentUser.name} 的薄弱点生成个性化试卷
        </p>
        
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl flex flex-col gap-4">
           <div className="flex flex-col md:flex-row gap-4">
               <div className="flex-1">
                  <label className="block text-[10px] md:text-xs font-bold text-purple-200 uppercase mb-1">科目</label>
                  <select 
                    value={request.subject}
                    onChange={(e) => setRequest({...request, subject: e.target.value})}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300 appearance-none"
                  >
                    <option value="数学" className="text-gray-800">数学 (Mathematics)</option>
                    <option value="物理" className="text-gray-800">物理 (Physics)</option>
                    <option value="英语" className="text-gray-800">英语 (English)</option>
                    <option value="语文" className="text-gray-800">语文 (Chinese)</option>
                  </select>
               </div>
               <div className="flex-1">
                  <label className="block text-[10px] md:text-xs font-bold text-purple-200 uppercase mb-1">复习重点</label>
                  <input 
                    type="text" 
                    placeholder="例如：二次函数、力学"
                    value={request.chapter}
                    onChange={(e) => setRequest({...request, chapter: e.target.value})}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2.5 text-white placeholder-purple-200/50 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
               </div>
           </div>
           
           <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-3 rounded-lg font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center ${
                  isGenerating 
                    ? 'bg-purple-900/50 text-purple-200 cursor-wait' 
                    : 'bg-white text-purple-700 hover:bg-purple-50'
                }`}
              >
                {isGenerating ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> 命题推理中...</> : '立即生成试卷'}
              </button>
        </div>
      </div>

      <div className="space-y-4">
         <h3 className="font-bold text-gray-700 text-sm md:text-base">历史试卷归档</h3>
         {exams.length === 0 ? (
           <div className="text-center py-12 text-gray-400">
             <i className="fa-solid fa-file-contract text-4xl mb-3 opacity-30"></i>
             <p className="text-sm">暂无记录，请生成第一份试卷。</p>
           </div>
         ) : (
           exams.map(exam => (
             <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                  <div className="flex-1 min-w-0 mr-2">
                    <h4 className="font-bold text-lg text-gray-800 truncate">{exam.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                        {new Date(exam.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="text-brand-600 hover:text-brand-800 text-sm font-medium whitespace-nowrap bg-brand-50 px-3 py-1 rounded">
                     <i className="fa-solid fa-download mr-1"></i> PDF
                  </button>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs md:text-sm text-gray-700 whitespace-pre-wrap max-h-60 md:max-h-96 overflow-y-auto border border-gray-200">
                  {exam.content}
                </div>
             </div>
           ))
         )}
      </div>
    </div>
  );
};

export default ExamCenter;