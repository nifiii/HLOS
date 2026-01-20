
import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
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

      // 触发成功动画
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4A90E2', '#5FD4A0', '#FFB84D']
      });

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
    const subjectColors: Record<string, string> = {
      '数学': '#3B82F6',
      '语文': '#FB7185',
      '英语': '#A78BFA',
      '科学': '#10B981',
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* 原图预览 */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setZoomLevel(prev => prev === 1 ? 2 : 1)}>
          <img src={reviewItem.imageUrl} className="w-full rounded-xl" alt="上传的图片" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.3s' }} />
          <div className="text-center text-sm text-gray-500 mt-4">点击查看{zoomLevel === 1 ? '大' : '原'}图</div>
        </Card>

        {/* 识别结果 */}
        <div className="space-y-4">
          {reviewItem.meta.problems?.map((problem: any, index) => {
            const color = subjectColors[problem.subject || '数学'] || '#4A90E2';

            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold">第 {index + 1} 题</span>
                  <span
                    className="px-3 py-1 text-sm rounded-full font-medium"
                    style={{
                      backgroundColor: color + '20',
                      color: color,
                    }}
                  >
                    {problem.subject || '通用'}
                  </span>
                </div>

                {/* 题目内容 */}
                <div className="mb-4">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {problem.content || problem.originalQuestion}
                  </div>
                </div>

                {/* 学生答案 */}
                {problem.studentAnswer && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4">
                    <div className="text-sm text-red-700 font-medium mb-1">你的答案</div>
                    <div className="text-gray-700">{problem.studentAnswer}</div>
                  </div>
                )}

                {/* 正确答案/老师批注 */}
                {problem.teacherComment && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4">
                    <div className="text-sm text-green-700 font-medium mb-1">老师批注</div>
                    <div className="text-gray-700">{problem.teacherComment}</div>
                  </div>
                )}

                {/* 订正记录 */}
                {problem.correction && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded mb-4">
                    <div className="text-sm text-amber-700 font-medium mb-1">订正记录</div>
                    <div className="text-gray-700">{problem.correction}</div>
                  </div>
                )}

                {/* 知识点标签 */}
                {problem.knowledgePoints && problem.knowledgePoints.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {problem.knowledgePoints.map((point: string, i: number) => (
                      <Badge key={i} variant="default">{point}</Badge>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-4 flex gap-4">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleSaveAndArchive}
          >
            保存到知识库
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setPreview(null);
              setReviewItem(null);
            }}
          >
            重新识别
          </Button>
        </div>
      </motion.div>
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
