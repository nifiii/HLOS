# Dashboard 实时统计功能实施计划

> **For Claude:** REQUIRED SUBKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Dashboard 添加实时统计功能，显示今日/本周收录数、错题总数、掌握率和最近7天学习趋势

**Architecture:** 前端计算统计（无需后端API），使用 Recharts 绘制趋势图

**Tech Stack:**
- React Hooks (useMemo, useState)
- Recharts（图表库）
- TypeScript

---

## Task 1: 安装 Recharts 依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装 recharts 和 recharts-to-svg**

```bash
npm install recharts recharts-to-svg
```

**Expected:** package.json 添加依赖

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add recharts for dashboard trend chart"
```

---

## Task 2: 创建 useDashboardStats Hook

**Files:**
- Create: `hooks/useDashboardStats.ts`

**Step 1: Create the Hook file**

```typescript
// hooks/useDashboardStats.ts
import { useMemo } from 'react';
import { ScannedItem } from '../types';

export interface DashboardStats {
  todayCount: number;
  weekCount: number;
  totalWrong: number;
  masteryRate: number;
  last7Days: {
    date: string;  // Format: "01-20"
    count: number;
  }[];
}

export const useDashboardStats = (scannedItems: ScannedItem[]): DashboardStats => {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
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
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();

      const count = scannedItems.filter(
        item => item.timestamp >= dayStart && item.timestamp <= dayEnd
      ).length;

      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${month}-${day}`;

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

**Step 2: Commit**

```bash
git add hooks/useDashboardStats.ts
git commit -m "feat: add useDashboardStats hook for real-time statistics
- Calculate today/week count
- Calculate total wrong problems
- Calculate mastery rate
- Generate last 7 days trend data"
```

---

## Task 3: 创建 TrendChart 组件

**Files:**
- Create: `components/TrendChart.tsx`

**Step 1: Create trend chart component**

```typescript
// components/TrendChart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendData {
  date: string;
  count: number;
}

interface TrendChartProps {
  data: TrendData[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#4A90E2"
          strokeWidth={2}
          dot={{ fill: "#4A90E2", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

**Step 2: Commit**

```bash
git add components/TrendChart.tsx
git commit -m "feat: add TrendChart component
- Use recharts for line chart
- Responsive container
- Custom tooltip styling
- Match brand colors"
```

---

## Task 4: 更新 Dashboard 组件集成统计

**Files:**
- Modify: `components/Dashboard.tsx`

**Step 1: Remove hardcoded stats data**

Find and remove the hardcoded `stats` object (around line 70-90).

**Step 2: Import the new hook and chart**

Add imports at top of file:

```typescript
import { useDashboardStats } from '../hooks/useDashboardStats';
import { TrendChart } from './TrendChart';
```

**Step 3: Replace stats initialization**

Replace the hardcoded stats with:

```typescript
// 使用实时统计 Hook
const stats = useDashboardStats(items);
```

**Step 4: Update the trend chart section**

Find the "本周学习趋势" section (around line 150-170) and replace with:

```tsx
{/* 最近7天学习趋势 */}
<div className="bg-white rounded-2xl p-6 shadow-card">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-bold text-gray-800">最近7天学习趋势</h3>
    <span className="text-sm text-gray-500">每日收录数量</span>
  </div>
  <TrendChart data={stats.last7Days} />
</div>
```

**Step 5: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: integrate real-time statistics in Dashboard
- Use useDashboardStats hook for live calculations
- Replace hardcoded stats with real data
- Add TrendChart for 7-day trend visualization
- Remove hardcoded placeholder data"
```

---

## Task 5: 更新 StatCard 组件

**Files:**
- Modify: `components/Dashboard.tsx` (StatCard section)

**Step 1: Update StatCard rendering**

Find the stats cards section (around line 90-140) and update to use real stats:

```tsx
{/* 4个统计卡片 */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  <StatCard
    title="今日收录"
    value={stats.todayCount}
    icon={<BookOpen className="w-5 h-5" />}
    trend={stats.todayCount > 0 ? 'up' : 'neutral'}
    color="blue"
  />

  <StatCard
    title="本周收录"
    value={stats.weekCount}
    icon={<Calendar className="w-5 h-5" />}
    trend="up"
    color="green"
  />

  <StatCard
    title="待复习（错题）"
    value={stats.totalWrong}
    icon={<AlertCircle className="w-5 h-5" />}
    color="red"
  />

  <StatCard
    title="掌握率"
    value={`${stats.masteryRate}%`}
    icon={<Target className="w-5 h-5" />}
    trend={stats.masteryRate >= 80 ? 'up' : stats.masteryRate >= 60 ? 'neutral' : 'down'}
    color={stats.masteryRate >= 80 ? 'green' : stats.masteryRate >= 60 ? 'yellow' : 'red'}
  />
</div>
```

**Step 2: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: update StatCard components with real-time data
- Today count from useDashboardStats
- Week count from useDashboardStats
- Wrong problems total from useDashboardStats
- Mastery rate percentage from useDashboardStats
- Dynamic trend indicators based on actual values"
```

---

## Task 6: 测试实时统计功能

**Files:**
- Test: `components/Dashboard.tsx`
- Test: `hooks/useDashboardStats.ts`

**Step 1: Start development server**

```bash
npm run dev
```

**Expected:** Server starts on http://localhost:5173

**Step 2: Open browser and navigate to Dashboard**

Open: http://localhost:5173

**Step 3: Verify statistics cards display**

Check:
- [ ] "今日收录" shows 0 or actual count
- [ ] "本周收录" shows 0 or actual count
- [ ] "待复习（错题）" shows total wrong problems
- [ ] "掌握率" shows percentage (0-100%)

**Step 4: Upload test data**

1. Navigate to "拍题录入"
2. Upload a test image
3. Analyze and save
4. Return to Dashboard

**Step 5: Verify data updates**

Check:
- [ ] Statistics cards update automatically
- [ ] "今日收录" increases by 1
- [ ] Trend chart shows the new entry

**Step 6: Commit**

```bash
git add .
git commit -m "test: verify real-time statistics functionality
- Verified stats cards display correctly
- Tested data updates after adding scanned items
- Confirmed trend chart renders
- All calculations working as expected"
```

---

## Task 7: 更新项目文档

**Files:**
- Modify: `docs/PROJECT_OVERVIEW.md`
- Modify: `README.md`

**Step 1: Update PROJECT_OVERVIEW.md Dashboard section**

Find the "### 3.1 Dashboard (概览面板)" section and update the functionality description:

Add bullet point:
- ✅ **实时统计**: 基于扫描数据实时计算今日/本周收录、错题总数、掌握率
- ✅ **趋势可视化**: 最近7天学习趋势折线图（Recharts）

**Step 2: Update README.md features section**

Update the "核心价值主张" section:

Add:
- 📊 **实时统计**: 自动计算学习数据，无需手动记录
- 👨‍👩‍👧‍👦 **家庭友好**: 简洁PIN码认证，防止误操作

**Step 3: Commit**

```bash
git add docs/PROJECT_OVERVIEW.md README.md
git commit -m "docs: update Dashboard functionality description
- Add real-time statistics feature
- Add 7-day trend visualization
- Update feature list with new capabilities"
```

---

## Task 8: 创建 PIN 配置文档（可选，为用户认证做准备）

**Files:**
- Create: `docs/PIN_SETUP.md`

**Step 1: Create PIN setup guide**

```markdown
# 家庭PIN码设置指南

## 默认PIN码

**管理员（父母）**: 1234
**学生（孩子）**: 0000

## 修改管理员PIN码

编辑文件：`backend/src/routes/auth.ts`

找到行：
```typescript
const ADMIN_PIN_HASH = '$2b$10$...'; // 当前是"1234"的hash
```

生成新的PIN hash：

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('你的新PIN', 10).then(hash => console.log(hash));"
```

替换 `ADMIN_PIN_HASH` 的值

## 重启后端

```bash
cd /opt/hl-os/backend
npm run build
systemctl restart hl-backend
```
```

**Step 2: Commit**

```bash
git add docs/PIN_SETUP.md
git commit -m "docs: add PIN code setup guide for family authentication"
```

---

## Task 9: 构建和验证

**Step 1: Build frontend**

```bash
npm run build
```

**Expected**: Build completes without errors

**Step 2: Check build output**

```bash
lsla dist/
```

**Expected**: `index.html` and asset files present

**Step 3: Commit**

```bash
git add .
git commit -m "build: production build with dashboard statistics
- Recharts bundled
- TypeScript compilation successful
- All features tested
- Ready for deployment"
```

---

## Task 10: 部署验证（可选）

**Step 1: Deploy to server**

```bash
# SSH to server
ssh user@your-server

# Navigate to project
cd /opt/hl-os

# Pull latest code
git pull origin master

# Rebuild frontend
npm run build

# Restart backend
docker-compose restart backend
```

**Step 2: Verify in browser**

Open: `http://your-server/`

Check:
- [ ] Dashboard loads
- [ ] Statistics display correctly
- [ ] Trend chart renders

**Step 3: Commit**

```bash
git commit --allow-empty -m "deploy: verify dashboard statistics on production server
- All statistics working correctly
- Trend chart displaying properly
- Ready for family use"
```

---

## 实施检查清单

完成后验证：

- [ ] Recharts 依赖安装成功
- [ ] useDashboardStats Hook 创建完成
- [ ] TrendChart 组件创建完成
- [ ] Dashboard 组件集成统计
- [ ] 统计卡片显示实时数据
- [ ] 趋势图正确显示最近7天数据
- [ ] 添加新扫描项后数据自动更新
- [ ] 掌握率计算正确
- [ ] 构建无错误
- [ ] 文档已更新
- [ ] 代码已提交和推送

---

## 预期时间

- **总时间**: 1.5-2小时
- **开发**: 1小时
- **测试**: 30分钟
- **文档**: 15分钟
- **部署**: 15分钟

---

## 下一步

完成本计划后，可选择继续实施：

1. **用户认证功能**（P1优先级）
   - 创建 LoginModal 组件
   - 实现后端认证 API
   - 集成到 App.tsx

2. **删除功能**（P2优先级）
   - 实现后端删除 API
   - 前端删除按钮重新启用
   - 添加二次确认

3. **其他优化**
   - 根据 PROJECT_OVERVIEW.md 第9章的其他优化方向
