import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// PIN码存储（管理员PIN的bcrypt hash）
// 默认管理员PIN: 1234
const ADMIN_PIN_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
// 学生固定PIN: 0000
const STUDENT_PIN = '0000';

// Session存储（内存Map）
// Key: sessionId, Value: { role, userId, createdAt }
const sessions = new Map<string, {
  role: 'admin' | 'student';
  userId: string;
  createdAt: number;
}>();

// 失败尝试记录（防暴力破解）
// Key: IP address, Value: { count, lastAttempt }
const failedAttempts = new Map<string, {
  count: number;
  lastAttempt: number;
}>();

/**
 * 用户登录
 * POST /api/auth/login
 * Body: { pin: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body;

    // 验证PIN码格式
    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: 'PIN码必须是4位数字'
      });
    }

    // 检查失败尝试次数（防暴力破解）
    const ip = req.ip || 'unknown';
    const attempts = failedAttempts.get(ip);

    if (attempts && attempts.count >= 5) {
      const lockTime = 5 * 60 * 1000; // 5分钟
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;

      if (timeSinceLastAttempt < lockTime) {
        const remainingTime = Math.ceil((lockTime - timeSinceLastAttempt) / 1000);
        return res.status(429).json({
          success: false,
          error: `尝试次数过多，请在${remainingTime}秒后重试`
        });
      } else {
        // 锁定时间已过，重置计数
        failedAttempts.delete(ip);
      }
    }

    // 验证学生PIN（固定为0000）
    if (pin === STUDENT_PIN) {
      const sessionId = uuidv4();
      const sessionData = {
        role: 'student' as const,
        userId: 'child_1', // 默认第一个孩子
        createdAt: Date.now()
      };

      sessions.set(sessionId, sessionData);

      // 清除失败尝试记录
      failedAttempts.delete(ip);

      return res.json({
        success: true,
        data: {
          sessionId,
          role: 'student',
          userId: 'child_1'
        }
      });
    }

    // 验证管理员PIN（bcrypt hash验证）
    const isValidAdmin = await bcrypt.compare(pin, ADMIN_PIN_HASH);

    if (!isValidAdmin) {
      // 记录失败尝试
      if (attempts) {
        attempts.count++;
        attempts.lastAttempt = Date.now();
        failedAttempts.set(ip, attempts);
      } else {
        failedAttempts.set(ip, {
          count: 1,
          lastAttempt: Date.now()
        });
      }

      const remainingAttempts = 5 - (attempts ? attempts.count + 1 : 1);

      return res.status(401).json({
        success: false,
        error: `PIN码错误，剩余尝试次数：${remainingAttempts}`
      });
    }

    // 管理员登录成功
    const sessionId = uuidv4();
    const sessionData = {
      role: 'admin' as const,
      userId: 'admin',
      createdAt: Date.now()
    };

    sessions.set(sessionId, sessionData);

    // 清除失败尝试记录
    failedAttempts.delete(ip);

    return res.json({
      success: true,
      data: {
        sessionId,
        role: 'admin',
        userId: 'admin'
      }
    });

  } catch (error) {
    console.error('[auth/login] 错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 验证Session
 * POST /api/auth/verify
 * Body: { sessionId: string }
 */
router.post('/verify', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.json({
        success: false,
        error: '无效的sessionId'
      });
    }

    const session = sessions.get(sessionId);

    if (!session) {
      return res.json({
        success: false,
        error: 'Session不存在或已过期'
      });
    }

    return res.json({
      success: true,
      data: {
        role: session.role,
        userId: session.userId
      }
    });

  } catch (error) {
    console.error('[auth/verify] 错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 用户登出
 * POST /api/auth/logout
 * Body: { sessionId: string }
 */
router.post('/logout', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessionId && typeof sessionId === 'string') {
      sessions.delete(sessionId);
    }

    return res.json({
      success: true,
      message: '登出成功'
    });

  } catch (error) {
    console.error('[auth/logout] 错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取当前Session信息（调试用）
 * GET /api/auth/debug
 */
router.get('/debug', (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([sessionId, data]) => ({
    sessionId,
    ...data
  }));

  return res.json({
    success: true,
    data: {
      totalSessions: sessions.size,
      sessions: sessionList
    }
  });
});

export default router;
