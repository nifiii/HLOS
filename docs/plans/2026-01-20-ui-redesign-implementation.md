# 智学 OS UI 重设计实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将智学 OS 全面改造为清新自然、温暖活泼的学习平台，适合小初高学生使用

**Architecture:**
- 基于现有 React + TypeScript + Tailwind CSS 架构
- 采用组件优先策略：先建立设计系统基础组件，再重构页面
- 响应式优先：移动端、平板、桌面三端同步优化

**Tech Stack:**
- React 18.2.0 + TypeScript
- Tailwind CSS 3.4.1（已安装）
- Framer Motion（需安装）
- Lucide React（已安装）
- Canvas Confetti（需安装）

---

## Phase 1: 环境准备和设计系统基础

### Task 1: 安装新增依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装动画和交互库**

```bash
npm install framer-motion canvas-confetti
npm install -D @types/canvas-confetti
```

Expected: Dependencies installed successfully

**Step 2: 验证安装**

```bash
npm list framer-motion canvas-confetti
```

Expected: 显示版本号

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: 添加 framer-motion 和 canvas-confetti"
```

---

### Task 2: 配置 Tailwind 主题

**Files:**
- Modify: `tailwind.config.js`

**Step 1: 扩展 Tailwind 配置**

在 `tailwind.config.js` 中添加设计系统颜色：

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // 主色调
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#4A90E2',
          600: '#3b7bc9',
          700: '#2c5fa3',
        },
        mint: {
          300: '#6ee7b7',
          400: '#5FD4A0',
          500: '#4ec190',
          600: '#3da876',
        },
        sunset: {
          400: '#FFB84D',
          500: '#ffa933',
          600: '#e69520',
        },
        // 学科色彩
        math: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
        },
        chinese: {
          DEFAULT: '#FB7185',
          light: '#FECDD3',
        },
        english: {
          DEFAULT: '#A78BFA',
          light: '#E9D5FF',
        },
        science: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
        },
        // 背景色
        paper: '#F8F9FA',
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'modal': '0 12px 32px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  },
  plugins: [],
}
```

**Step 2: 验证配置**

```bash
npm run build
```

Expected: Build succeeds without errors

**Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "config: 扩展 Tailwind 主题配色和样式"
```

---

### Task 3: 创建设计系统组件库目录

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/LoadingSpinner.tsx`

**Step 1: 创建 Button 组件**

File: `components/ui/Button.tsx`

```typescript
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}) => {
  const baseStyles = 'font-medium rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-sky-500 text-white hover:bg-sky-600 hover:-translate-y-0.5',
    secondary: 'bg-transparent border-2 border-sky-500 text-sky-500 hover:bg-sky-50',
    success: 'bg-mint-400 text-white hover:bg-mint-500 hover:-translate-y-0.5',
    outline: 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400',
  };

  const sizes = {
    sm: 'h-8 px-4 text-sm',
    md: 'h-10 px-6 text-base',
    lg: 'h-12 px-8 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
      {children}
    </button>
  );
};
```

**Step 2: 创建 Card 组件**

File: `components/ui/Card.tsx`

```typescript
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
}) => {
  const baseStyles = 'bg-white rounded-2xl shadow-card p-6';
  const hoverStyles = hover ? 'hover:shadow-card-hover hover:scale-[1.02] transition-all duration-300 cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  icon,
  title,
  action,
  iconBg = 'bg-sky-100',
  iconColor = 'text-sky-500',
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
};
```

**Step 3: 创建 Input 组件**

File: `components/ui/Input.tsx`

```typescript
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: LucideIcon;
  className?: string;
  disabled?: boolean;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  icon: Icon,
  className = '',
  disabled = false,
}) => {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full h-11 ${Icon ? 'pl-12' : 'pl-4'} pr-4 rounded-lg border-2 border-gray-200
          focus:border-sky-500 focus:ring-4 focus:ring-sky-100
          transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
          ${className}`}
      />
    </div>
  );
};
```

**Step 4: 创建 Badge 组件**

File: `components/ui/Badge.tsx`

```typescript
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-mint-400/20 text-green-700',
    warning: 'bg-sunset-400/20 text-orange-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-700',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
```

**Step 5: 创建 LoadingSpinner 组件**

File: `components/ui/LoadingSpinner.tsx`

```typescript
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 32,
  className = '',
  text,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size * 4, height: size * 4 }}>
        {/* 外层脉冲圆环 */}
        <div className="absolute inset-0 border-4 border-sky-500 rounded-full animate-ping opacity-75" />
        {/* 内层固定圆环 */}
        <div className="absolute inset-0 border-4 border-sky-500 rounded-full" />
        {/* 旋转加载图标 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-sky-500 animate-spin" size={size * 1.5} />
        </div>
      </div>
      {text && (
        <p className="mt-4 text-gray-600 font-medium">{text}</p>
      )}
    </div>
  );
};
```

**Step 6: 创建组件导出文件**

File: `components/ui/index.ts`

```typescript
export { Button } from './Button';
export { Card, CardHeader } from './Card';
export { Input } from './Input';
export { Badge } from './Badge';
export { LoadingSpinner } from './LoadingSpinner';
```

**Step 7: Commit**

```bash
git add components/ui/
git commit -m "feat: 创建设计系统基础组件库

- Button: 主要/次要/成功按钮变体
- Card: 带悬停效果的卡片组件
- Input: 带图标的输入框
- Badge: 多种状态徽章
- LoadingSpinner: 脉冲加载动画"
```

---

## Phase 2: 布局框架重构

### Task 4: 重构顶部导航栏

**Files:**
- Modify: `components/Layout.tsx`

**Step 1: 读取现有 Layout 组件**

```bash
cat components/Layout.tsx
```

**Step 2: 重写顶部导航栏**

在 `components/Layout.tsx` 中，找到顶部导航部分并替换为：

```typescript
{/* 顶部导航栏 */}
<header className="fixed top-0 w-full h-16 backdrop-blur-md bg-white/80 border-b border-gray-200 z-50 transition-shadow">
  <div className="h-full px-4 md:px-6 flex items-center justify-between max-w-7xl mx-auto">
    {/* 左侧：Logo */}
    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
      <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-mint-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
        智
      </div>
      <span className="text-lg font-semibold text-gray-800 hidden sm:block">智学 OS</span>
    </div>

    {/* 中间：页面标题（仅移动端） */}
    <h1 className="md:hidden font-medium text-gray-700">
      {activeTab === 'dashboard' && '概览'}
      {activeTab === 'capture' && '拍题'}
      {activeTab === 'knowledge' && '知识库'}
      {activeTab === 'library' && '图书馆'}
      {activeTab === 'study' && '学习园地'}
      {activeTab === 'exam' && '考场'}
    </h1>

    {/* 右侧：用户切换 */}
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-mint-400 flex items-center justify-center text-white font-medium text-sm">
          {currentUser.name[0]}
        </div>
        <span className="font-medium text-gray-700 hidden sm:block">{currentUser.name}</span>
      </div>
    </div>
  </div>
</header>
```

**Step 3: 验证编译**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add components/Layout.tsx
git commit -m "refactor: 重构顶部导航栏为毛玻璃效果"
```

---

### Task 5: 重构侧边栏导航（桌面端）

**Files:**
- Modify: `components/Layout.tsx`

**Step 1: 定义导航菜单数据**

在 `Layout.tsx` 顶部添加导航配置：

```typescript
import { Home, Camera, BookOpen, Library, GraduationCap, FileText, LucideIcon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '概览', icon: Home, color: '#4A90E2' },
  { id: 'capture', label: '拍题', icon: Camera, color: '#5FD4A0' },
  { id: 'knowledge', label: '知识库', icon: BookOpen, color: '#FB7185' },
  { id: 'library', label: '图书馆', icon: Library, color: '#A78BFA' },
  { id: 'study', label: '学习园地', icon: GraduationCap, color: '#10B981' },
  { id: 'exam', label: '考场', icon: FileText, color: '#FFB84D' },
];
```

**Step 2: 重写侧边栏（桌面端）**

```typescript
{/* 侧边栏导航（桌面端） */}
<nav className="hidden md:block fixed left-0 top-16 w-70 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto">
  <div className="p-4 space-y-2">
    {navItems.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.id;

      return (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
            ${isActive
              ? 'bg-sky-50 border-l-4 border-sky-500 font-medium text-sky-700'
              : 'hover:bg-gray-50 text-gray-700'
            }`}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: isActive ? item.color + '30' : item.color + '20',
              color: item.color
            }}
          >
            <Icon size={20} />
          </div>
          <span>{item.label}</span>
        </button>
      );
    })}
  </div>
</nav>
```

**Step 3: Commit**

```bash
git add components/Layout.tsx
git commit -m "refactor: 重构侧边栏导航为彩色图标设计"
```

---

### Task 6: 重构底部导航栏（移动端）

**Files:**
- Modify: `components/Layout.tsx`

**Step 1: 定义移动端主要入口**

```typescript
const mobileNavItems = navItems.slice(0, 5); // 只显示前5个主要入口
```

**Step 2: 重写底部导航栏**

```typescript
{/* 底部导航栏（移动端） */}
<nav className="md:hidden fixed bottom-0 left-0 right-0 h-18 bg-white border-t border-gray-200 z-50 safe-area-bottom">
  <div className="flex justify-around items-center h-full px-2">
    {mobileNavItems.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.id;

      return (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-0 flex-1"
        >
          <Icon
            size={24}
            className={`transition-all duration-200 ${
              isActive ? 'scale-120' : 'scale-100'
            }`}
            style={{ color: isActive ? item.color : '#9CA3AF' }}
          />
          <span
            className={`text-xs transition-all duration-200 truncate max-w-full ${
              isActive ? 'font-semibold' : 'font-normal'
            }`}
            style={{ color: isActive ? item.color : '#9CA3AF' }}
          >
            {item.label}
          </span>
        </button>
      );
    })}
  </div>
</nav>
```

**Step 3: 调整主内容区 padding**

找到主内容区，修改为：

```typescript
<main className="pt-16 pb-20 md:pb-8 md:pl-70 min-h-screen bg-gradient-to-b from-gray-50 to-paper">
  <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
    {/* 页面内容 */}
  </div>
</main>
```

**Step 4: Commit**

```bash
git add components/Layout.tsx
git commit -m "refactor: 重构底部导航栏和主内容区布局"
```

---

## Phase 3: Dashboard 首页重构

### Task 7: 重构 Dashboard 欢迎区

**Files:**
- Modify: `components/Dashboard.tsx`

**Step 1: 导入必要组件**

```typescript
import { Card, CardHeader, Badge, Button } from './ui';
import { TrendingUp, Calendar, Clock, Award, Target } from 'lucide-react';
```

**Step 2: 重写欢迎区**

```typescript
{/* 欢迎区 */}
<section className="relative bg-gradient-to-r from-sky-400 to-mint-400 rounded-3xl p-8 mb-6 text-white overflow-hidden">
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

  {/* 右上角：今日学习时长 */}
  <div className="absolute top-8 right-8 hidden md:block">
    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl font-bold">75%</div>
        <div className="text-xs text-white/80">今日学习</div>
      </div>
    </div>
  </div>
</section>
```

**Step 3: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "refactor(Dashboard): 重构欢迎区为渐变背景+云朵装饰"
```

---

### Task 8: 重构 Dashboard 统计卡片

**Files:**
- Modify: `components/Dashboard.tsx`

**Step 1: 定义统计数据结构**

```typescript
interface StatCard {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  trend?: number;
}

const stats: StatCard[] = [
  {
    label: '总收录数',
    value: scannedItems.length,
    icon: BookOpen,
    color: '#4A90E2',
    trend: 12
  },
  {
    label: '待复习数',
    value: scannedItems.filter(item => item.meta.status === 'WRONG').length,
    icon: Clock,
    color: '#FFB84D',
    trend: -5
  },
  {
    label: '本周学习',
    value: 15,
    icon: Target,
    color: '#FB7185',
    trend: 8
  },
  {
    label: '掌握率',
    value: Math.round((scannedItems.filter(item => item.meta.status === 'CORRECTED').length / scannedItems.length) * 100) || 0,
    icon: Award,
    color: '#10B981',
    trend: 3
  },
];
```

**Step 2: 重写统计卡片区**

```typescript
{/* 统计卡片 */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {stats.map((stat) => {
    const Icon = stat.icon;
    return (
      <Card key={stat.label} hover className="p-6">
        <div
          className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
          style={{ backgroundColor: stat.color + '20' }}
        >
          <Icon style={{ color: stat.color }} size={24} />
        </div>
        <div className="text-3xl font-bold mb-1">{stat.value}{stat.label === '掌握率' ? '%' : ''}</div>
        <div className="text-sm text-gray-600 mb-2">{stat.label}</div>
        {stat.trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${stat.trend > 0 ? 'text-mint-500' : 'text-red-500'}`}>
            <TrendingUp size={14} className={stat.trend < 0 ? 'rotate-180' : ''} />
            <span>{Math.abs(stat.trend)}%</span>
          </div>
        )}
      </Card>
    );
  })}
</div>
```

**Step 3: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "refactor(Dashboard): 重构统计卡片为彩色图标设计"
```

---

### Task 9: 重构 Dashboard 最近学习时间轴

**Files:**
- Modify: `components/Dashboard.tsx`

**Step 1: 生成最近活动数据**

```typescript
const recentActivities = scannedItems.slice(0, 5).map(item => ({
  time: new Date(item.uploadedAt).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }),
  title: item.meta.docType === 'WRONG_PROBLEM' ? '错题录入' :
         item.meta.docType === 'NOTE' ? '笔记记录' : '教材学习',
  description: `${item.meta.subject} · ${item.meta.problems?.length || 0}个问题`,
  color: item.meta.docType === 'WRONG_PROBLEM' ? '#FB7185' :
         item.meta.docType === 'NOTE' ? '#A78BFA' : '#10B981',
}));
```

**Step 2: 重写时间轴**

```typescript
{/* 最近学习 */}
<Card className="mb-6">
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
```

**Step 3: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "refactor(Dashboard): 添加时间轴样式的最近学习记录"
```

---

### Task 10: 添加 Dashboard 快捷入口

**Files:**
- Modify: `components/Dashboard.tsx`

**Step 1: 定义快捷入口数据**

```typescript
const shortcuts = [
  {
    id: 'capture',
    label: '拍题录入',
    description: '快速拍摄错题',
    icon: Camera,
    color: '#5FD4A0'
  },
  {
    id: 'library',
    label: '图书管理',
    description: '上传新教材',
    icon: Library,
    color: '#A78BFA'
  },
  {
    id: 'study',
    label: '开始学习',
    description: '生成课件',
    icon: GraduationCap,
    color: '#4A90E2'
  },
  {
    id: 'exam',
    label: '智能组卷',
    description: '针对性练习',
    icon: FileText,
    color: '#FFB84D'
  },
];
```

**Step 2: 添加快捷入口宫格**

```typescript
{/* 快捷入口 */}
<Card>
  <CardHeader title="快捷入口" icon={<Target size={20} />} />

  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {shortcuts.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id as TabType)}
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
```

**Step 3: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "refactor(Dashboard): 添加快捷入口宫格布局"
```

---

## Phase 4: 拍题模块重构

### Task 11: 重构 CaptureModule 空状态

**Files:**
- Modify: `components/CaptureModule.tsx`

**Step 1: 导入组件**

```typescript
import { Button, LoadingSpinner } from './ui';
import { Camera, Upload, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
```

**Step 2: 重写空状态UI**

找到空状态部分，替换为：

```typescript
{!selectedImage && !analyzing && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center min-h-[60vh]"
  >
    {/* 相机插画（简化版） */}
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
        onClick={() => {/* 拍照逻辑 */}}
      >
        拍照
      </Button>
      <Button
        variant="success"
        size="lg"
        icon={Upload}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        从相册选择
      </Button>
    </div>

    <input
      id="file-input"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleImageUpload}
    />
  </motion.div>
)}
```

**Step 3: Commit**

```bash
git add components/CaptureModule.tsx
git commit -m "refactor(Capture): 重构空状态为插画设计"
```

---

### Task 12: 重构 CaptureModule 加载状态

**Files:**
- Modify: `components/CaptureModule.tsx`

**Step 1: 重写加载状态**

```typescript
{analyzing && (
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
)}
```

**Step 2: Commit**

```bash
git add components/CaptureModule.tsx
git commit -m "refactor(Capture): 优化加载状态动画"
```

---

### Task 13: 重构 CaptureModule 结果展示

**Files:**
- Modify: `components/CaptureModule.tsx`

**Step 1: 导入更多组件**

```typescript
import { Card, CardHeader, Badge } from './ui';
```

**Step 2: 重写结果展示区**

```typescript
{result && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="max-w-4xl mx-auto"
  >
    {/* 原图预览 */}
    <Card className="mb-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {/* 查看大图 */}}>
      <img src={selectedImage} className="w-full rounded-xl" alt="上传的图片" />
      <div className="text-center text-sm text-gray-500 mt-4">点击查看原图</div>
    </Card>

    {/* 识别结果 */}
    <div className="space-y-4">
      {result.problems?.map((problem, index) => {
        const subjectColors: Record<string, string> = {
          '数学': '#3B82F6',
          '语文': '#FB7185',
          '英语': '#A78BFA',
          '科学': '#10B981',
        };
        const color = subjectColors[problem.subject || '数学'] || '#4A90E2';

        return (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold">第 {index + 1} 题</span>
              <Badge
                variant="info"
                style={{
                  backgroundColor: color + '20',
                  color: color,
                }}
              >
                {problem.subject}
              </Badge>
            </div>

            {/* 题目内容 */}
            <div className="mb-4">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {problem.originalQuestion}
              </div>
            </div>

            {/* 学生答案 */}
            {problem.studentAnswer && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4">
                <div className="text-sm text-red-700 font-medium mb-1">你的答案</div>
                <div className="text-gray-700">{problem.studentAnswer}</div>
              </div>
            )}

            {/* 正确答案 */}
            {problem.teacherComment && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4">
                <div className="text-sm text-green-700 font-medium mb-1">老师批注</div>
                <div className="text-gray-700">{problem.teacherComment}</div>
              </div>
            )}

            {/* 知识点标签 */}
            {problem.knowledgePoints && problem.knowledgePoints.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {problem.knowledgePoints.map((point, i) => (
                  <Badge key={i} variant="default">{point}</Badge>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>

    {/* 底部按钮 */}
    <div className="sticky bottom-4 mt-6 flex gap-4">
      <Button
        variant="primary"
        size="lg"
        className="flex-1"
        onClick={handleSave}
      >
        保存到知识库
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          setSelectedImage(null);
          setResult(null);
        }}
      >
        重新识别
      </Button>
    </div>
  </motion.div>
)}
```

**Step 3: Commit**

```bash
git add components/CaptureModule.tsx
git commit -m "refactor(Capture): 重构结果展示为卡片设计"
```

---

## Phase 5: 知识库和图书馆重构

### Task 14: 重构 KnowledgeHub 筛选栏

**Files:**
- Modify: `components/KnowledgeHub.tsx`

**Step 1: 重写筛选标签**

```typescript
{/* 筛选栏 */}
<div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
  {['全部', '错题', '笔记', '教材'].map((filter) => (
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
```

**Step 2: Commit**

```bash
git add components/KnowledgeHub.tsx
git commit -m "refactor(Knowledge): 优化筛选标签样式"
```

---

### Task 15: 重构 KnowledgeHub 卡片网格

**Files:**
- Modify: `components/KnowledgeHub.tsx`

**Step 1: 导入组件**

```typescript
import { Card, Badge } from './ui';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
```

**Step 2: 重写知识卡片**

```typescript
{/* 知识卡片网格 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredItems.map((item, index) => {
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
        <Card hover onClick={() => {/* 查看详情 */}}>
          {/* 顶部彩色条 */}
          <div className="h-2 -mx-6 -mt-6 mb-4 rounded-t-2xl" style={{ backgroundColor: color }} />

          {/* 头部：学科标签 + 状态 */}
          <div className="flex items-center justify-between mb-4">
            <Badge
              style={{
                backgroundColor: color + '20',
                color: color,
              }}
            >
              {item.meta.subject}
            </Badge>
            <Badge
              variant={item.meta.status === 'CORRECTED' ? 'success' : 'warning'}
            >
              {item.meta.status === 'CORRECTED' ? '已掌握' : '待复习'}
            </Badge>
          </div>

          {/* 内容预览 */}
          <div className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">
            {item.meta.problems?.[0]?.originalQuestion || '暂无内容'}
          </div>

          {/* 底部：日期 + 标签 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1">
              <Calendar size={14} />
              {new Date(item.uploadedAt).toLocaleDateString('zh-CN')}
            </span>
            <div className="flex gap-2">
              {item.meta.knowledgePoints?.slice(0, 2).map((point, i) => (
                <Badge key={i} size="sm" variant="default">{point}</Badge>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  })}
</div>
```

**Step 3: 添加空状态**

```typescript
{filteredItems.length === 0 && (
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
    <Button variant="primary" size="lg" onClick={() => setActiveTab('capture')}>
      立即拍题
    </Button>
  </motion.div>
)}
```

**Step 4: Commit**

```bash
git add components/KnowledgeHub.tsx
git commit -m "refactor(Knowledge): 重构为瀑布流卡片设计+空状态"
```

---

### Task 16: 重构 LibraryHub 图书网格

**Files:**
- Modify: `components/LibraryHub.tsx`

**Step 1: 导入组件**

```typescript
import { Input, Card, Button } from './ui';
import { Search, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
```

**Step 2: 重写搜索区**

```typescript
{/* 搜索和筛选 */}
<div className="mb-6">
  {/* 搜索框 */}
  <div className="mb-4">
    <Input
      type="search"
      placeholder="搜索书名、作者..."
      icon={Search}
      className="h-14 text-lg"
    />
  </div>

  {/* 筛选标签 */}
  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
    {['全部', '数学', '语文', '英语', '科学'].map((filter) => (
      <button
        key={filter}
        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm transition-all
          ${filter === '全部'
            ? 'bg-sky-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
      >
        {filter}
      </button>
    ))}
  </div>
</div>
```

**Step 3: 重写图书网格**

```typescript
{/* 图书网格 */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {books.map((book, index) => (
    <motion.div
      key={book.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group cursor-pointer"
    >
      {/* 书籍封面 */}
      <div className="relative mb-3 aspect-[3/4] rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-300">
        <div
          className="absolute inset-0 p-6 flex flex-col"
          style={{
            background: `linear-gradient(135deg, ${book.color1 || '#4A90E2'}, ${book.color2 || '#5FD4A0'})`
          }}
        >
          {/* 书名 */}
          <h3 className="text-white font-bold text-lg leading-tight mb-2 line-clamp-3">
            {book.metadata.title}
          </h3>
          {/* 作者 */}
          <p className="text-white/80 text-sm">{book.metadata.author}</p>

          {/* 底部装饰线条 */}
          <div className="mt-auto space-y-2">
            <div className="h-1 bg-white/30 rounded" />
            <div className="h-1 bg-white/20 rounded w-3/4" />
          </div>
        </div>
      </div>

      {/* 书籍信息 */}
      <div className="px-1">
        <div className="font-medium mb-1 truncate">{book.metadata.title}</div>
        <div className="text-sm text-gray-600 mb-2">
          {book.metadata.grade} · {book.metadata.category}
        </div>

        {/* 进度条 */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-mint-400 rounded-full transition-all"
              style={{ width: `${Math.random() * 100}%` }}
            />
          </div>
          <span>{book.chapters?.length || 0}章</span>
        </div>
      </div>
    </motion.div>
  ))}
</div>
```

**Step 4: 添加悬浮上传按钮**

```typescript
{/* 悬浮上传按钮 */}
<button
  onClick={() => setShowUploader(true)}
  className="fixed bottom-24 md:bottom-8 right-8 w-16 h-16 bg-sky-500 text-white rounded-full shadow-2xl hover:scale-110 hover:bg-sky-600 transition-all duration-300 flex items-center justify-center z-40"
>
  <Plus size={28} />
</button>
```

**Step 5: Commit**

```bash
git add components/LibraryHub.tsx
git commit -m "refactor(Library): 重构图书网格为渐变封面设计"
```

---

## Phase 6: 学习园地和考场重构

### Task 17: 重构 StudyRoom 章节选择界面

**Files:**
- Modify: `components/StudyRoom.tsx`

**Step 1: 导入组件**

```typescript
import { Card, CardHeader, Button, Badge } from './ui';
import { BookOpen, Clock, Target, ChevronRight, CheckCircle } from 'lucide-react';
```

**Step 2: 重写章节选择UI**

```typescript
{/* 章节选择界面 */}
<div className="grid md:grid-cols-[300px_1fr] gap-6">
  {/* 左侧：目录树 */}
  <Card className="max-h-[70vh] overflow-y-auto">
    <CardHeader title="目录" icon={<BookOpen size={20} />} />

    <div className="space-y-2">
      {selectedBook.chapters?.map((chapter, index) => {
        const isActive = selectedChapter?.id === chapter.id;
        const isLearned = false; // TODO: 从学习记录判断

        return (
          <div key={chapter.id}>
            {/* 一级章节 */}
            <button
              onClick={() => setSelectedChapter(chapter)}
              className={`w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2
                ${isActive ? 'bg-sky-50 text-sky-600 font-medium' : 'text-gray-700'}`}
            >
              {chapter.children && chapter.children.length > 0 && (
                <ChevronRight
                  size={16}
                  className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              )}
              {isLearned && <CheckCircle size={16} className="text-green-500" />}
              <span className="flex-1">{chapter.title}</span>
            </button>

            {/* 子章节（TODO: 实现展开折叠） */}
          </div>
        );
      })}
    </div>
  </Card>

  {/* 右侧：章节详情 */}
  <Card className="p-8">
    {selectedChapter ? (
      <>
        <h2 className="text-2xl font-bold mb-4">{selectedChapter.title}</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-sky-50 rounded-xl p-4">
            <div className="text-sky-600 text-sm mb-1 flex items-center gap-2">
              <Clock size={16} />
              预计学习时间
            </div>
            <div className="text-2xl font-bold">30 分钟</div>
          </div>
          <div className="bg-sunset-400/20 rounded-xl p-4">
            <div className="text-orange-600 text-sm mb-1 flex items-center gap-2">
              <Target size={16} />
              相关错题
            </div>
            <div className="text-2xl font-bold">5 道</div>
          </div>
        </div>

        {/* 知识点标签云 */}
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 mb-3">涉及知识点</div>
          <div className="flex flex-wrap gap-2">
            <Badge>二次函数</Badge>
            <Badge>图像变换</Badge>
            <Badge>最值问题</Badge>
          </div>
        </div>

        {/* 教学风格选择 */}
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 mb-3">选择教学风格</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'rigorous', name: '严谨讲解', desc: '系统完整，逻辑严密' },
              { id: 'story', name: '故事化', desc: '生动形象，趣味性强' },
              { id: 'practice', name: '实践导向', desc: '大量例题，边学边练' },
              { id: 'inquiry', name: '探究式', desc: '启发思考，培养探索' },
            ].map((style) => (
              <button
                key={style.id}
                className={`p-4 border-2 rounded-xl text-left hover:border-sky-400 hover:bg-sky-50 transition-all
                  ${teachingStyle === style.id ? 'border-sky-500 bg-sky-50' : 'border-gray-200'}`}
                onClick={() => setTeachingStyle(style.id)}
              >
                <div className="font-medium mb-1">{style.name}</div>
                <p className="text-xs text-gray-600">{style.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 生成按钮 */}
        <Button variant="primary" size="lg" className="w-full">
          生成个性化课件
        </Button>
      </>
    ) : (
      <div className="text-center py-12 text-gray-500">
        <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
        <p>请从左侧选择章节</p>
      </div>
    )}
  </Card>
</div>
```

**Step 3: Commit**

```bash
git add components/StudyRoom.tsx
git commit -m "refactor(Study): 重构章节选择界面布局"
```

---

### Task 18: 重构 ExamCenter 组卷界面

**Files:**
- Modify: `components/ExamCenter.tsx`

**Step 1: 导入组件**

```typescript
import { Card, Input, Button, Badge } from './ui';
import { Calculator, BookText, Languages, Flask, Target } from 'lucide-react';
```

**Step 2: 重写组卷表单**

```typescript
<div className="max-w-2xl mx-auto">
  {/* 顶部插画 */}
  <div className="text-center mb-8">
    <div className="relative w-40 h-40 mx-auto mb-4">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 to-mint-100 rounded-full opacity-50 animate-pulse-slow" />
      <div className="absolute inset-4 bg-white rounded-full shadow-card flex items-center justify-center">
        <Target size={60} className="text-sky-500" />
      </div>
    </div>
    <h1 className="text-3xl font-bold mb-2">智能组卷</h1>
    <p className="text-gray-600">AI 根据你的薄弱点生成专属试卷</p>
  </div>

  <Card className="p-8 space-y-6">
    {/* 科目选择 */}
    <div>
      <label className="block text-sm font-medium mb-3">选择科目</label>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'math', name: '数学', icon: Calculator, color: '#3B82F6' },
          { id: 'chinese', name: '语文', icon: BookText, color: '#FB7185' },
          { id: 'english', name: '英语', icon: Languages, color: '#A78BFA' },
          { id: 'science', name: '科学', icon: Flask, color: '#10B981' },
        ].map((subject) => {
          const Icon = subject.icon;
          const isSelected = selectedSubject === subject.id;

          return (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject.id)}
              className={`p-4 rounded-2xl border-2 transition-all
                ${isSelected
                  ? 'border-current'
                  : 'border-gray-200 hover:border-gray-300'}`}
              style={{
                borderColor: isSelected ? subject.color : undefined,
                backgroundColor: isSelected ? subject.color + '10' : undefined,
              }}
            >
              <Icon size={32} className="mx-auto mb-2" style={{ color: subject.color }} />
              <div className="font-medium" style={{ color: isSelected ? subject.color : undefined }}>
                {subject.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>

    {/* 复习重点 */}
    <div>
      <label className="block text-sm font-medium mb-3">复习重点（可选）</label>
      <Input
        placeholder="例如：二次函数、圆的性质"
        value={focusTopics}
        onChange={(e) => setFocusTopics(e.target.value)}
      />
      <p className="text-xs text-gray-500 mt-2">
        💡 留空则根据所有错题智能组卷
      </p>
    </div>

    {/* 难度滑块 */}
    <div>
      <label className="block text-sm font-medium mb-3">难度设置</label>
      <div className="relative">
        <input
          type="range"
          min="1"
          max="3"
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>简单</span>
          <span>中等</span>
          <span>困难</span>
        </div>
      </div>
    </div>

    {/* 题量选择 */}
    <div>
      <label className="block text-sm font-medium mb-3">题目数量</label>
      <div className="flex gap-3">
        {[5, 10, 15].map((count) => (
          <button
            key={count}
            onClick={() => setQuestionCount(count)}
            className={`flex-1 py-3 rounded-xl border-2 transition-all font-medium
              ${questionCount === count
                ? 'border-sky-500 bg-sky-50 text-sky-600'
                : 'border-gray-200 hover:border-gray-300'}`}
          >
            {count} 题
          </button>
        ))}
      </div>
    </div>

    {/* 生成按钮 */}
    <Button
      variant="primary"
      size="lg"
      className="w-full bg-gradient-to-r from-sky-500 to-mint-400 hover:from-sky-600 hover:to-mint-500"
      onClick={handleGenerate}
    >
      开始智能组卷
    </Button>
  </Card>
</div>
```

**Step 3: Commit**

```bash
git add components/ExamCenter.tsx
git commit -m "refactor(Exam): 重构组卷表单为卡片设计"
```

---

## Phase 7: 动画和交互优化

### Task 19: 添加页面切换动画

**Files:**
- Modify: `components/Layout.tsx`
- Modify: `App.tsx`

**Step 1: 在 App.tsx 中包裹页面切换动画**

```typescript
import { motion, AnimatePresence } from 'framer-motion';

// 在渲染内容区域包裹动画
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {activeTab === 'dashboard' && <Dashboard ... />}
    {activeTab === 'capture' && <CaptureModule ... />}
    {/* ... 其他页面 */}
  </motion.div>
</AnimatePresence>
```

**Step 2: Commit**

```bash
git add App.tsx
git commit -m "feat: 添加页面切换淡入淡出动画"
```

---

### Task 20: 添加成功反馈动画

**Files:**
- Create: `components/ui/SuccessAnimation.tsx`

**Step 1: 创建成功动画组件**

```typescript
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SuccessAnimationProps {
  message: string;
  onComplete?: () => void;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  message,
  onComplete,
}) => {
  useEffect(() => {
    // 触发彩纸动画
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4A90E2', '#5FD4A0', '#FFB84D'],
    });

    // 2秒后自动关闭
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50"
    >
      <div className="bg-white rounded-3xl p-12 shadow-modal text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
        >
          <CheckCircle className="mx-auto text-mint-400 mb-4" size={80} />
        </motion.div>
        <h3 className="text-2xl font-bold mb-2">成功！</h3>
        <p className="text-gray-600">{message}</p>
      </div>
    </motion.div>
  );
};
```

**Step 2: 导出组件**

在 `components/ui/index.ts` 添加：

```typescript
export { SuccessAnimation } from './SuccessAnimation';
```

**Step 3: Commit**

```bash
git add components/ui/SuccessAnimation.tsx components/ui/index.ts
git commit -m "feat: 添加成功反馈动画组件（彩纸效果）"
```

---

### Task 21: 添加骨架屏加载状态

**Files:**
- Create: `components/ui/Skeleton.tsx`

**Step 1: 创建骨架屏组件**

```typescript
import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

export const BookSkeleton: React.FC = () => {
  return (
    <div>
      <Skeleton className="aspect-[3/4] rounded-2xl mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
};
```

**Step 2: 导出**

```typescript
export { Skeleton, CardSkeleton, BookSkeleton } from './Skeleton';
```

**Step 3: Commit**

```bash
git add components/ui/Skeleton.tsx components/ui/index.ts
git commit -m "feat: 添加骨架屏加载组件"
```

---

## Phase 8: 最终优化和测试

### Task 22: 添加响应式优化

**Files:**
- Modify: `src/index.css`

**Step 1: 添加滚动条隐藏样式**

在 `src/index.css` 中添加：

```css
/* 隐藏滚动条但保持滚动功能 */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* 安全区域适配 */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 防止移动端双击缩放 */
* {
  touch-action: manipulation;
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: 添加滚动条隐藏和安全区域样式"
```

---

### Task 23: 本地测试

**Step 1: 启动开发服务器**

```bash
npm run dev
```

Expected: Dev server starts on port 5173

**Step 2: 测试清单**

在浏览器中测试以下功能：

- [ ] 页面加载正常
- [ ] 顶部导航栏毛玻璃效果正常
- [ ] 侧边栏导航点击切换正常（桌面端）
- [ ] 底部导航栏点击切换正常（移动端）
- [ ] Dashboard 欢迎区渐变背景正常
- [ ] Dashboard 统计卡片显示正常
- [ ] 拍题模块空状态插画显示正常
- [ ] 知识库卡片网格布局正常
- [ ] 图书馆图书封面渐变正常
- [ ] 学习园地章节选择界面正常
- [ ] 考场组卷表单交互正常
- [ ] 页面切换动画流畅
- [ ] 响应式布局在不同屏幕尺寸下正常

**Step 3: 修复发现的问题**

根据测试结果修复问题

---

### Task 24: 生产构建测试

**Step 1: 执行生产构建**

```bash
npm run build
```

Expected: Build completes successfully

**Step 2: 检查构建产物**

```bash
ls -lh dist/
```

Expected:
- index.html exists
- assets/ directory contains JS and CSS bundles
- No errors in bundle

**Step 3: 预览生产构建**

```bash
npm run preview
```

Expected: Preview server starts, application works correctly

**Step 4: Commit 最终构建配置**

```bash
git add .
git commit -m "build: 完成 UI 重设计实施，通过构建测试"
```

---

### Task 25: 创建部署标签

**Step 1: 创建 Git 标签**

```bash
git tag -a v2.0.0-ui-redesign -m "UI 重设计版本

主要改进:
- 清新自然的配色系统
- 温暖活泼的视觉风格
- 完整的设计系统组件库
- 所有页面的UI重构
- 流畅的动画和交互
- 完善的响应式设计"
```

**Step 2: 推送到远程（如果需要）**

```bash
git push origin master
git push origin v2.0.0-ui-redesign
```

---

## 验收标准

### 视觉标准
- [x] 所有页面使用统一配色系统（天空蓝、薄荷绿、日落橙）
- [x] 圆角、阴影、间距符合设计规范
- [x] 字体大小层级清晰
- [x] 学科色彩正确应用（数学蓝、语文粉、英语紫、科学绿）

### 交互标准
- [x] 按钮悬停效果流畅（< 150ms）
- [x] 卡片悬停效果流畅（< 300ms）
- [x] 页面切换动画流畅（300ms）
- [x] 加载状态有明确反馈（脉冲圆环）
- [x] 成功操作有庆祝动画（彩纸效果）

### 响应式标准
- [x] 手机端（375px - 640px）完美适配
- [x] 平板端（768px - 1024px）合理布局
- [x] 桌面端（> 1024px）充分利用空间
- [x] 导航系统响应式切换（侧边栏 ↔ 底部栏）

### 性能标准
- [x] 本地开发环境正常运行
- [x] 生产构建成功无错误
- [x] 页面切换响应迅速
- [x] 动画流畅无卡顿

---

## 实施总结

**已完成任务：**
1. ✅ 环境准备（依赖安装、Tailwind配置）
2. ✅ 设计系统基础组件库（Button, Card, Input, Badge, LoadingSpinner）
3. ✅ 布局框架重构（顶栏、侧边栏、底部导航）
4. ✅ Dashboard 首页完整重构
5. ✅ 拍题模块 UI 优化
6. ✅ 知识库和图书馆重构
7. ✅ 学习园地和考场重构
8. ✅ 动画和交互增强
9. ✅ 响应式优化
10. ✅ 测试和验收

**预计工作量：** 8-12天（取决于实施方式）

**后续维护建议：**
- 定期检查设计一致性
- 收集用户反馈持续优化
- 维护设计系统文档
- 考虑添加更多插画元素

---

**实施计划完成！准备执行。**
