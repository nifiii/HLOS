
import React, { useState, useRef } from 'react';
import { analyzeImage } from '../services/geminiService';
import { ProcessingStatus, ScannedItem, UserProfile, DocType, ProblemStatus } from '../types';
import { Button, LoadingSpinner, Card, Badge } from './ui';
import { Camera, Upload, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface CaptureModuleProps {
  onScanComplete: (item: ScannedItem) => void;
  currentUser: UserProfile;
}

const CaptureModule: React.FC<CaptureModuleProps> = ({ onScanComplete, currentUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<ScannedItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setReviewItem(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!preview) return;
    setIsProcessing(true);
    try {
      const result = await analyzeImage(preview);
      const newItem: ScannedItem = {
        id: Date.now().toString(),
        ownerId: currentUser.id,
        timestamp: Date.now(),
        imageUrl: preview,
        rawMarkdown: result.text,
        meta: result.meta,
        status: ProcessingStatus.PROCESSED
      };
      setReviewItem(newItem);
    } catch (error: any) {
      alert(error.message || "AI 语义解构失败，请重试。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndArchive = () => {
    if (reviewItem) {
      onScanComplete(reviewItem);
      setPreview(null);
      setReviewItem(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateProblemStatus = (index: number, status: ProblemStatus) => {
    if (!reviewItem || !reviewItem.meta.problems) return;
    const newProblems = [...reviewItem.meta.problems];
    newProblems[index] = { ...newProblems[index], status };
    setReviewItem({
      ...reviewItem,
      meta: { ...reviewItem.meta, problems: newProblems }
    });
  };

  if (reviewItem) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] animate-fade-in bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="relative h-[25%] md:h-[30%] bg-slate-900 border-b-4 border-brand-500 overflow-hidden">
          <div className="w-full h-full overflow-auto review-scrollbar p-4 flex justify-center items-start">
            <img 
              src={reviewItem.imageUrl} 
              className="transition-all duration-300 origin-top cursor-zoom-in rounded shadow-2xl"
              style={{ width: `${100 * zoomLevel}%`, maxWidth: 'none' }}
              onClick={() => setZoomLevel(prev => prev === 1 ? 2 : 1)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 review-scrollbar space-y-6">
           <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-800 flex items-center text-sm md:text-base">
                 <i className="fa-solid fa-microscope mr-2 text-brand-500"></i> 四层解构校核 (Expert Protocol)
              </h3>
              <button onClick={() => setReviewItem(null)} className="text-[10px] font-bold text-slate-400 hover:text-red-500">重拍</button>
           </div>

           <div className="space-y-4 pb-10">
              {reviewItem.meta.problems?.map((p: any, idx) => (
                <div key={idx} className={`p-4 md:p-5 rounded-2xl border-2 transition-all ${
                  p.status === ProblemStatus.WRONG ? 'bg-red-50 border-red-100' :
                  p.status === ProblemStatus.CORRECTED ? 'bg-amber-50 border-amber-200' :
                  'bg-emerald-50 border-emerald-100 opacity-90'
                }`}>
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-2">
                         <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-black border border-slate-200">{idx+1}</span>
                         <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                           p.status === ProblemStatus.WRONG ? 'bg-red-500 text-white' :
                           p.status === ProblemStatus.CORRECTED ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                         }`}>
                            {p.status === 'wrong' ? '错题' : p.status === 'corrected' ? '已订正' : '正确'}
                         </span>
                      </div>
                      <div className="flex bg-white/80 p-1 rounded-lg border border-slate-200 shadow-sm">
                         {[ProblemStatus.CORRECT, ProblemStatus.WRONG, ProblemStatus.CORRECTED].map(s => (
                           <button 
                             key={s} 
                             onClick={() => updateProblemStatus(idx, s)}
                             className={`px-3 py-1 text-[9px] font-black rounded-md ${p.status === s ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                           >
                             {s === 'wrong' ? '错' : s === 'correct' ? '对' : '订'}
                           </button>
                         ))}
                      </div>
                   </div>
                   
                   <div className="space-y-3 text-[11px] leading-relaxed">
                      <div className="text-slate-800 bg-white/60 p-2 rounded-lg border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">原始内容 (层级 1)</span>
                        {p.content}
                      </div>
                      {p.studentAnswer && (
                        <div className="text-brand-700">
                          <span className="text-[9px] font-black text-brand-300 uppercase block">学生回答 (层级 3)</span>
                          {p.studentAnswer}
                        </div>
                      )}
                      {p.teacherComment && (
                        <div className="text-red-600 bg-red-100/30 p-2 rounded">
                          <span className="text-[9px] font-black text-red-300 uppercase block">批改反馈 (层级 2)</span>
                          {p.teacherComment}
                        </div>
                      )}
                      {p.correction && (
                        <div className="text-amber-800 bg-amber-100/50 p-2 rounded font-black border border-amber-200/50">
                          <span className="text-[9px] font-black text-amber-400 uppercase block">订正记录 (层级 4)</span>
                          {p.correction}
                        </div>
                      )}
                   </div>
                </div>
              ))}
           </div>

           <div className="fixed bottom-4 left-4 right-4 md:relative md:bottom-0 md:left-0 md:right-0">
             <button onClick={handleSaveAndArchive} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-black py-4 rounded-2xl shadow-2xl transition-all">
               <i className="fa-solid fa-file-export mr-2"></i> 同步至档案库 (L1-L4 闭环)
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
         <div className="flex items-center space-x-4 relative z-10">
            <span className="text-4xl">{currentUser.avatar}</span>
            <div>
               <h3 className="text-xl font-black">四层语义解构拍题</h3>
               <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest">教育 OCR 科学家模型服务中</p>
            </div>
         </div>
      </div>

      {!preview && !isProcessing ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[60vh]"
        >
          {/* 相机插画 */}
          <div className="relative w-64 h-64 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 to-mint-100 rounded-full opacity-50 animate-pulse-slow" />
            <div className="absolute inset-8 bg-white rounded-3xl shadow-card flex items-center justify-center">
              <Camera size={80} className="text-sky-500" />
            </div>
            {/* 星星装饰 */}
            <div className="absolute top-4 right-4 w-6 h-6 bg-sunset-400 rounded-full opacity-60" />
            <div className="absolute bottom-8 left-4 w-4 h-4 bg-mint-400 rounded-full opacity-60" />
          </div>

          <h2 className="text-2xl font-semibold mb-2 text-gray-800">拍下错题</h2>
          <p className="text-gray-600 mb-8">AI 帮你智能分析薄弱点</p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="primary"
              size="lg"
              icon={Camera}
              onClick={() => fileInputRef.current?.click()}
            >
              拍照
            </Button>
            <Button
              variant="success"
              size="lg"
              icon={Upload}
              onClick={() => fileInputRef.current?.click()}
            >
              从相册选择
            </Button>
          </div>

          <input
            id="file-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </motion.div>
      ) : preview && !isProcessing ? (
        <Card className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner">
            <img src={preview} className="max-h-[50vh] mx-auto" />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-4 right-4 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleProcess}
            disabled={isProcessing}
          >
            <i className="fa-solid fa-bolt mr-2"></i> 启动 AI 识别
          </Button>
        </Card>
      ) : isProcessing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh]"
        >
          <LoadingSpinner size={48} text="AI 正在识别中..." />
          <p className="text-sm text-gray-500 mt-4">识别速度受网络影响</p>

          {/* 进度提示 */}
          <div className="mt-8 w-64">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-sky-400 to-mint-400"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
};

export default CaptureModule;
