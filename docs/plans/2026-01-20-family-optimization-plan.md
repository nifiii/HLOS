# 家庭场景优化方案

**目标**: 为家庭单租户场景设计简洁、实用的用户认证和统计功能
**部署类型**: 家庭私有部署（2C4G服务器）
**用户规模**: 3-5人（父母 + 2-3个孩子）

---

## 1. 用户认证方案

### 1.1 设计原则

**❌ 不需要**（多租户SaaS才需要）：
- OAuth/SSO登录
- 邮箱验证
- 手机号验证
- 复杂权限系统（RBAC）
- Token过期刷新
- 多租户隔离

**✅ 需要**（家庭场景）：
- 简单PIN码（4-6位数字）
- 父母管理员 + 孩子用户
- 防止孩子误操作（删除/清空）
- 本地Session（无过期烦恼）

### 1.2 方案设计

#### 家庭角色定义

| 角色 | PIN码 | 权限 |
|------|-------|------|
| **管理员（父母）** | 父母设置的4位PIN | - 全部功能<br>- 可删除数据<br>- 可查看所有孩子的学习记录 |
| **学生（孩子）** | 固定简单PIN（如0000） | - 拍题、学习<br>- 无法删除<br>- 无法切换到其他孩子的��图 |

#### 认证流程

```typescript
// 后端API
POST /api/auth/login
{
  "pin": "1234"  // 4位PIN码
}

响应：
{
  "success": true,
  "data": {
    "sessionId": "uuid-xxx",
    "role": "admin",  // "admin" | "student"
    "userId": "admin"  // 管理员固定为"admin"，学生返回实际ID
  }
}

// Session存储（内存，无过期）
{
  "sessionId": "uuid-xxx",
  "role": "admin",
  "userId": "child_1",
  "createdAt": 1737360000
}
```

#### 前端实现

**Login Modal**（首次访问显示）：
```tsx
// components/LoginModal.tsx
const [pin, setPin] = useState('');

// 4位PIN输入
// 管理员：自定义PIN（父母设置）
// 学生：固定显示"0000"
```

**Session管理**：
```typescript
// 登录成功后
localStorage.setItem('sessionId', data.sessionId);
localStorage.setItem('role', data.role);

// 刷新时自动检查
const checkSession = async () => {
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    // 验证Session是否有效
    const valid = await verifySession(sessionId);
    if (!valid) {
      // 显示登录框
    }
  } else {
    // 显示登录框
  }
};
```

### 1.3 安全措施

1. **PIN码加密存储**（bcrypt hash）
2. **防止暴力破解**（5次失败锁定5分钟）
3. **操作确认**（管理员删除需二次确认）

---

## 2. 实时统计方案

### 2.1 统计维度

**Dashboard 显示**：

| 指标 | 说明 | 数据源 |
|------|------|--------|
| 今日收录 | 今天扫描的错题/笔记数量 | `scannedItems` state |
| 本周收录 | 本周一到今天新增数量 | `scannedItems` state |
| 错题总数 | 状态为WRONG的题目数量 | `scannedItems[].meta.problems` |
| 掌握率 | CORRECT / (CORRECT + WRONG) | 计算得出 |
| 最近7天趋势 | 每天收录数量（折线图） | `scannedItems.timestamp` |

### 2.2 数据结构

```typescript
// Dashboard统计数据
interface DashboardStats {
  todayCount: number;        // 今日收录
  weekCount: number;         // 本周收录
  totalWrong: number;        // 错题总数
  masteryRate: number;      // 掌握率（0-100%）
  last7Days: {
    date: string;           // "01-20"
    count: number;          // 收录数量
  }[];
}
```

### 2.3 实现方案

#### 前端计算（无后端API）

```typescript
// hooks/useDashboardStats.ts
export const useDashboardStats = (scannedItems: ScannedItem[]) => {
  const stats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = today - 7 * 24 * 60 * 60 * 1000;

    // 今日收录
    const todayCount = scannedItems.filter(
      item => item.timestamp >= today
    ).length;

    // 本周收录
    const weekCount = scannedItems.filter(
      item => item.timestamp >= weekAgo
    ).length;

    // 错题总数
    let totalWrong = 0;
    scannedItems.forEach(item => {
      if (item.meta.problems) {
        totalWrong += item.meta.problems.filter(
          p => p.status === 'WRONG'
        ).length;
      }
    });

    // 掌握率
    let totalCorrect = 0;
    let totalWrongCount = 0;
    scannedItems.forEach(item => {
      if (item.meta.problems) {
        item.meta.problems.forEach(p => {
          if (p.status === 'CORRECT') totalCorrect++;
          if (p.status === 'WRONG') totalWrongCount++;
        });
      }
    });
    const masteryRate = totalCorrect + totalWrongCount > 0
      ? Math.round((totalCorrect / (totalCorrect + totalWrongCount)) * 100)
      : 0;

    // 最近7天趋势
    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today - i * 24 * 60 * 60 * 1000);
      const dayStart = date.setHours(0, 0, 0, 0);
      const dayEnd = date.setHours(23, 59, 59, 999);

      const count = scannedItems.filter(
        item => item.timestamp >= dayStart && item.timestamp <= dayEnd
      ).length;

      const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      last7Days.push({ date: dateStr, count });
    }

    return {
      todayCount,
      weekCount,
      totalWrong,
      masteryRate,
      last7Days
    };
  }, [scannedItems]);

  return stats;
};
```

#### Dashboard组件更新

```typescript
// Dashboard.tsx
import { useDashboardStats } from '../hooks/useDashboardStats';

const Dashboard: React.FC<DashboardProps> = ({ items, currentUser }) => {
  const stats = useDashboardStats(items);

  return (
    <div>
      {/* 4个统计卡片 */}
      <StatsGrid>
        <StatCard title="今日收录" value={stats.todayCount} trend={stats.todayCount > 0 ? 'up' : 'neutral'} />
        <StatCard title="本周收录" value={stats.weekCount} trend="up" />
        <StatCard title="错题总数" value={stats.totalWrong} color="red" />
        <StatCard title="掌握率" value={`${stats.masteryRate}%`} />
      </StatsGrid>

      {/* 最近7天趋势图 */}
      <TrendChart data={stats.last7Days} />
    </div>
  );
};
```

### 2.4 轻量级图表

**使用 Recharts**（适合小数据集）：

```bash
npm install recharts
```

```typescript
// components/TrendChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export const TrendChart = ({ data }) => (
  <LineChart width={300} height={150} data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="count" stroke="#4A90E2" />
  </LineChart>
);
```

---

## 3. 实施计划

### 阶段1: 用户认证（1-2小时）

1. **后端**
   - 创建 `backend/src/routes/auth.ts`
   - Session存储（内存Map）
   - PIN码验证（bcrypt）
   - 登录/登出API

2. **前端**
   - 创建 `components/LoginModal.tsx`
   - 添加Session检查
   - App.tsx集成登录流程

### 阶段2: 实时统计（2小时）

1. **创建 Hook**
   - `hooks/useDashboardStats.ts`

2. **Dashboard组件更新**
   - 集成统计Hook
   - 添加趋势图组件
   - 移除硬编码数据

### 阶段3: 删除功能（1小时）

1. **后端**
   - `DELETE /api/scanned-items/:id` - 删除扫描项
   - `DELETE /api/books/:id` - 删除教材
   - 文件系统删除 + 索引更新

2. **前端**
   - LibraryHub 删除按钮重新启用
   - KnowledgeHub 删除功能

---

## 4. 技术细节

### 4.1 后端代码示例

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';

const router = Router();

// PIN码存储（实际应该从配置文件读取）
const ADMIN_PIN_HASH = '$2b$10$...'; // bcrypt hash of "1234"

// Session存储（内存）
const sessions = new Map<string, {
  role: string;
  userId: string;
  createdAt: number;
}>();

router.post('/login', async (req, res) => {
  const { pin } = req.body;

  // 验证管理员PIN
  if (pin === '0000') {
    // 学生登录
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      role: 'student',
      userId: 'child_1', // 默认第一个孩子
      createdAt: Date.now()
    });
    return res.json({ success: true, data: { sessionId, role: 'student', userId: 'child_1' }});
  }

  // 验证父母PIN
  const isValid = await bcrypt.compare(pin, ADMIN_PIN_HASH);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'PIN码错误' });
  }

  const sessionId = uuidv4();
  sessions.set(sessionId, {
    role: 'admin',
    userId: 'admin',
    createdAt: Date.now()
  });

  return res.json({ success: true, data: { sessionId, role: 'admin', userId: 'admin' }});
});

router.post('/verify', (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.json({ success: false });
  }

  return res.json({ success: true, data: { role: session.role, userId: session.userId }});
});

router.post('/logout', (req, res) => {
  const { sessionId } = req.body;
  sessions.delete(sessionId);
  return res.json({ success: true });
});
```

### 4.2 前端代码示例

```typescript
// components/LoginModal.tsx
export const LoginModal: React.FC = () => {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'admin' | 'student'>('student');

  const handleLogin = async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });

    const result = await response.json();
    if (result.success) {
      localStorage.setItem('sessionId', result.data.sessionId);
      localStorage.setItem('role', result.data.role);
      window.location.reload();
    }
  };

  return (
    <Modal>
      {mode === 'student' ? (
        <>
          <h2>学生登录</h2>
          <button onClick={() => handleLogin()}>进入学习（无需PIN）</button>
        </>
      ) : (
        <>
          <h2>家长登录</h2>
          <input type="password" maxLength={4} onChange={(e) => setPin(e.target.value)} />
          <button onClick={handleLogin}>登录</button>
        </>
      )}
    </Modal>
  );
};
```

---

## 5. 数据流图

```
用户访问
   ↓
检查 LocalStorage.sessionId
   ↓
不存在? → 显示登录框
   ↓
输入PIN码
   ↓
验证成功 → 保��� sessionId
   ↓
加载 Dashboard（useDashboardStats 计算统计数据）
   ↓
显示实时统计
```

---

## 6. 安全考虑

### 6.1 家庭场景特点

**信任边界**：
- 家庭内部网络（私有部署）
- 用户都是家庭成员
- 主要风险：孩子误操作，而非外部攻击

**安全策略**：
1. ✅ **足够**：防止孩子误删数据
2. ✅ **简洁**：父母容易使用
3. ❌ **不需要**：HTTPS证书复杂配置（家庭可用HTTP）
4. ❌ **不需要**：复杂的RBAC权限

### 6.2 最小化安全措施

1. **PIN码**（比密码简单，比无保护强）
2. **操作确认**（删除需二次确认）
3. **操作日志**（记录删除操作，可追溯）
4. **数据备份**（每日自动备份）

---

## 7. 优先级排序

| 功能 | 优先级 | 预计时间 | 价值 |
|------|--------|---------|------|
| 实时统计 | P0 | 2小时 | ⭐⭐⭐⭐⭐ |
| 用户认证 | P1 | 1-2小时 | ⭐⭐⭐ |
| 删除功能 | P2 | 1小时 | ⭐⭐ |
| 趋势图 | P3 | 30分钟 | ⭐⭐ |

---

## 8. 实施建议

### 第一批：实时统计（优先）

**原因**：
- ✅ 立即看到价值（数据可视化）
- ✅ 无需修改现有流程
- ✅ 纯前端实现，无风险

**实施步骤**：
1. 创建 `useDashboardStats` Hook
2. Dashboard 组件集成
3. 测试验证

### 第二批：用户认证

**原因**：
- ✅ 防止孩子误操作
- ✅ 增加安全感
- ⚠️ 需要修改启动流程

**实施步骤**：
1. 后端认证API
2. 前端登录Modal
3. App.tsx集成

### 第三批：删除功能

**原因**：
- ✅ 完善功能闭环
- ⚠️ 涉及文件删除，需谨慎

---

## 9. 成功标准

### 9.1 实时统计

- [ ] Dashboard显示今日/本周收录数
- [ ] 显示错题总数和掌握率
- [ ] 最近7天趋势图（折线图）
- [ ] 数据实时更新（无需刷新页面）

### 9.2 用户认证

- [ ] 首次访问显示登录框
- [ ] 学生无需PIN即可进入
- [ ] 父母输入PIN后获得管理权限
- [ ] Session持续到关闭浏览器
- [ ] 删除操作需要管理员权限

### 9.3 删除功能

- [ ] 管理员可删除扫描项
- [ ] 管理员可删除教材
- [ ] 删除前二次确认
- [ ] 删除成功后自动刷新列表

---

**是否开始实施实时统计功能？**
