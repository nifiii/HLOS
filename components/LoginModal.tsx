import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Shield, Loader2 } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (sessionId: string, role: 'admin' | 'student', userId: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'student' | 'admin'>('student');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '0000' })
      });

      const result = await response.json();

      if (result.success) {
        // 保存session到localStorage
        localStorage.setItem('sessionId', result.data.sessionId);
        localStorage.setItem('role', result.data.role);
        localStorage.setItem('userId', result.data.userId);

        onLoginSuccess(result.data.sessionId, result.data.role, result.data.userId);
      } else {
        setError(result.error || '登录失败');
      }
    } catch (err) {
      console.error('[Student Login] 错误:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (pin.length !== 4) {
      setError('请输入4位PIN码');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const result = await response.json();

      if (result.success) {
        // 保存session到localStorage
        localStorage.setItem('sessionId', result.data.sessionId);
        localStorage.setItem('role', result.data.role);
        localStorage.setItem('userId', result.data.userId);

        onLoginSuccess(result.data.sessionId, result.data.role, result.data.userId);
      } else {
        setError(result.error || 'PIN码错误');
      }
    } catch (err) {
      console.error('[Admin Login] 错误:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    // 只允许数字
    const numericValue = value.replace(/\D/g, '');
    // 限制4位
    if (numericValue.length <= 4) {
      setPin(numericValue);
      setError(null);
    }
  };

  const handleSubmit = () => {
    if (mode === 'student') {
      handleStudentLogin();
    } else {
      handleAdminLogin();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* 顶部装饰条 */}
        <div className="h-2 bg-gradient-to-r from-sky-400 to-mint-400" />

        <div className="p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-mint-400 mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              欢迎使用智学 OS
            </h2>
            <p className="text-sm text-gray-600">请选择登录方式</p>
          </div>

          {/* 角色选择 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => {
                setMode('student');
                setError(null);
                setPin('');
              }}
              className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                mode === 'student'
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-gray-200 hover:border-sky-300'
              }`}
            >
              <User className={`w-8 h-8 mx-auto mb-3 ${
                mode === 'student' ? 'text-sky-500' : 'text-gray-400'
              }`} />
              <div className="font-medium mb-1">学生</div>
              <div className="text-xs text-gray-500">快速进入学习</div>
            </button>

            <button
              onClick={() => {
                setMode('admin');
                setError(null);
                setPin('');
              }}
              className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                mode === 'admin'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <Shield className={`w-8 h-8 mx-auto mb-3 ${
                mode === 'admin' ? 'text-purple-500' : 'text-gray-400'
              }`} />
              <div className="font-medium mb-1">家长</div>
              <div className="text-xs text-gray-500">PIN码登录</div>
            </button>
          </div>

          {/* 学生模式 */}
          {mode === 'student' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-sm text-gray-600 mb-6">
                学生模式无需PIN码，点击下方按钮即可进入
              </p>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-sky-400 to-mint-400 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '进入学习'
                )}
              </button>
            </motion.div>
          )}

          {/* 管理员模式 */}
          {mode === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  请输入4位PIN码
                </label>
                <div className="flex justify-center gap-3 mb-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-16 h-20 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all duration-200 ${
                        error
                          ? 'border-red-300 bg-red-50 text-red-600'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      {pin[index] || (
                        <span className="text-gray-300 text-2xl">•</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 隐藏的输入框 */}
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={4}
                  className="opacity-0 absolute"
                  autoFocus
                />

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 text-center mt-3"
                  >
                    {error}
                  </motion.div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading || pin.length !== 4}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    验证中...
                  </>
                ) : (
                  '登录'
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                默认PIN码: 1234
              </p>
            </motion.div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            💡 提示：家长登录后可以管理所有孩子的学习记录
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginModal;
