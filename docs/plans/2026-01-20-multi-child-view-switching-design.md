# 多孩子视图切换优化设计文档

**设计日期**: 2026-01-20
**设计目标**: 优化多子女家庭中孩子自主切换视图的用户体验
**核心原则**: 简单、快速、直观、信息平等

---

## 1. 设计背��

### 1.1 当前系统现状

**已有实现**：
- ✅ 多用户数据隔离（通过 `ownerId` 过滤）
- ✅ 用户切换功能（在 Layout 组件中）
- ✅ 数据隔离：错题/笔记/图片等按用户隔离
- ✅ 共享数据：图书馆教材全家族共享

**存在的问题**：
- 切换功能在顶部头像，可能不够明显
- 切换后没有明确的视觉反馈
- 每次打开都从默认用户（大宝）开始，没有记忆功能

### 1.2 用户需求

**使用场景**：
- 孩子自己主动切换视图（手动主动切换）
- 需要简单、快速、一键切换

**改进目标**：
- 切换功能更明显、更易发现
- 切换后有明确的视觉反馈
- 记住上次使用的孩子，方便继续使用

### 1.3 设计原则

**KISS原则（Keep It Simple, Stupid）**：
- 不引入复杂的权限系统
- 不添加家长/学生角色区分
- 保持信息透明和信任平等
- 最小化改动，最大化体验改进

---

## 2. UI 设计方案

### 2.1 快速切换按钮

**位置**：顶部导航栏右侧，与"设置"图标并列

**按钮样式**：
```
┌─────────────────────────────────────────────┐
│ 智学 OS              [切换到：大宝 👋] [设置] │
└─────────────────────────────────────────────┘
```

**按钮设计规范**：
- 形状：圆角矩形（rounded-xl）
- 背景：浅色背景（bg-gray-100）
- 边框：1px边框（border border-gray-300）
- 内容：当前用户头像 + "切换到：{用户名}"
- 尺寸：高度40px，内边距8-16px
- 图标：用户头像（16x16px）
- 字体：14px，加粗

**点击展开下拉菜单**：
```
┌─────────────────────────────────────────────┐
│ 智学 OS              [切换到：大宝 👋] [设置] │
│                    ┌──────────────────────┐   │
│                    │ ✓ 大宝 👦 高二      │   │
│ │   二宝 👧 初一      │   │
│                    └──────────────────────┘   │
└─────────────────────────────────────────────┘
```

**下拉菜单设计**：
- 宽度：200px
- 最大高度：300px（超出滚动）
- 阴影：box-shadow
- 圆角：rounded-lg
- 背景色：白色
- 边框：1px solid gray-200

**菜单项设计**：
- 布局：水平排列（头像 + 名字 + 年级）
- 高度：48px
- 当前用户：
  - 高亮背景（bg-sky-50）
  - 对勾标记（✓）
  - 文字颜色：sky-600
- 其他用户：
  - 普通背景（hover:bg-gray-50）
  - 无标记
  - 文字颜色：gray-700
- 间距：8px

### 2.2 Toast 提示

**触发时机**：用户切换后立即显示

**样式设计**：
```
┌─────────────────────────────────────────────┐
│          ✅ 已切换到大宝的视图                │
└─────────────────────────────────────────────┘
```

**样式规范**：
- 位置：顶部居中（距离顶部 20px）
- 背景：渐变色（from-sky-400 to-mint-400）
- 文字：白色，加粗，14px
- 内边距：12px 24px
- 圆角：rounded-2xl
- 阴影：box-shadow

**动画效果**：
- 入场：从顶部滑入（translate-y -100% → 0）
- 停留：2秒
- 退场：淡出（opacity 1 → 0）
- 时长：300ms（ease-in-out）

---

## 3. 技术实现方案

### 3.1 组件结构

**新增组件**：`components/UserSwitcher.tsx`

```typescript
interface UserSwitcherProps {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onUserSwitch: (userId: string) => void;
}

组件功能：
1. 显示当前用户头像和名字
2. 点击展开下拉菜单
3. 列出所有可选用户
4. 高亮当前用户（对勾标记）
5. 处理用户切换
6. 显示Toast提示
```

### 3.2 状态管理

**App.tsx 新增状态**：
```typescript
const [switchToast, setSwitchToast] = useState<string | null>(null);
```

**LocalStorage 记忆**：
```typescript
// 存储键
const LAST_USED_USER_KEY = 'lastUsedUserId';

// 保存
const saveLastUsedUser = (userId: string) => {
  localStorage.setItem(LAST_USED_USER_KEY, userId);
};

// 读取
const getLastUsedUser = (): string | null => {
  return localStorage.getItem(LAST_USED_USER_KEY);
};
```

**初始化逻辑**：
```typescript
useEffect(() => {
  const lastUserId = getLastUsedUser();
  if (lastUserId) {
    const user = FAMILY_PROFILES.find(u => u.id === lastUserId);
    if (user) {
      setCurrentUser(user);
    }
  }
}, []);
```

**切换用户处理**：
```typescript
const handleUserSwitch = (userId: string) => {
  const user = FAMILY_PROFILES.find(u => u.id === userId);
  if (user) {
    setCurrentUser(user);
    saveLastUsedUser(userId);
    setSwitchToast(`✅ 已切换到${user.name}的视图`);

    // Toast自动消失
    setTimeout(() => {
      setSwitchToast(null);
    }, 2000);
  }
};
```

### 3.3 Toast 组件

**复用 ErrorToast 样式**：
```typescript
const SwitchToast: React.FC = () => {
  if (!switchToast) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-sky-400 to-mint-400 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2"
    >
      <span className="text-sm font-bold">{switchToast}</span>
    </motion.div>
  );
};
```

### 3.4 集成到 Layout

**修改文件**：`components/Layout.tsx`

**修改位置**：用户切换区域

**替换内容**：
- 移除或注释掉原有的用户切换UI
- 添加新的 `UserSwitcher` 组件

**集成示例**：
```typescript
import { UserSwitcher } from './UserSwitcher';

// 在布局中使用
<UserSwitcher
  currentUser={currentUser}
  availableUsers={availableUsers}
  onUserSwitch={handleUserSwitch}
/>
```

---

## 4. 数据隔离规则

### 4.1 隔离数据（需切换视图才能看到）

**错题本**（Knowledge Hub）：
- 仅显示当前 `currentUser` 的错题
- `item.ownerId === currentUser.id`

**学习笔记**：
- 仅显示当前 `currentUser` 的笔记

**原始图片**（拍题录入）：
- 仅显示当前 `currentUser` 上传的图片

**AI 课件**（StudyRoom）：
- 仅显示为当前 `currentUser` 生成的课件

**AI 测验**：
- 仅显示当前 `currentUser` 的测验记录

**OCR 试卷作业**：
- 仅显示当前 `currentUser` 的试卷

**Dashboard 统计**：
- 今日收录、本周收录、错题总数、掌握率
- 7天学习趋势图
- 均基于当前 `currentUser` 的数据计算

### 4.2 共享数据（所有孩子可见）

**图书馆电子教材**：
- 所有孩子都可以看到
- 不按 `ownerId` 过滤
- 或使用 `ownerId: 'shared'` 标识

**实现方式**：
```typescript
// 图书馆不过滤 ownerId
const books = await fetchBooks({ /* 无过滤 */ });

// 或使用共享标识
const books = await fetchBooks({ ownerId: 'shared' });
```

### 4.3 数据过滤逻辑

**现有实现（保持不变）**：
```typescript
// App.tsx
const filteredItems = useMemo(() => {
  return scannedItems.filter(item => item.ownerId === currentUser.id);
}, [scannedItems, currentUser.id]);
```

**Dashboard 自动隔离**：
```typescript
// Dashboard.tsx
const Dashboard: React.FC<DashboardProps> = ({ items, currentUser }) => {
  const stats = useDashboardStats(items);
  // items 已在 App.tsx 中按 currentUser.id 过滤
  // 所以统计自动隔离
};
```

---

## 5. 用户交互流程

### 5.1 首次访问

```
打开应用
  ↓
无 localStorage 记忆
  ↓
显示大宝的视图（默认）
  ↓
大宝使用中...
```

### 5.2 切换到二宝

```
点击"切换到：大宝"按钮
  ↓
展开下拉菜单
  ↓
点击"二宝 👧 初一"
  ↓
显示 Toast："✅ 已切换到二宝的视图"
  ↓
数据重新过滤，显示二宝的内容和统计
  ↓
保存到 localStorage: lastUsedUserId = 'child_2'
```

### 5.3 下次打开

```
打开应用
  ↓
读取 localStorage: lastUsedUserId = 'child_2'
  ↓
自动设置 currentUser = 二宝
  ↓
显示二宝的视图和统计
  ↓
二宝继续使用...
```

### 5.4 再切换回大宝

```
点击"切换到：二宝"按钮
  ↓
展开下拉菜单
  ↓
点击"大宝 👦 高二"
  ↓
显示 Toast："✅ 已切换到大宝的视图"
  ↓
数据重新过滤，显示大宝的内容和统计
  ↓
保存到 localStorage: lastUsedUserId = 'child_1'
```

---

## 6. 实现检查清单

### 6.1 组件开发

- [ ] 创建 `components/UserSwitcher.tsx` 组件
- [ ] 实现下拉菜单展开/收起
- [ ] 添加当前用户高亮和对勾
- [ ] 集成到 Layout 组件

### 6.2 状态管理

- [ ] 添加 `switchToast` 状态
- [ ] 实现 `saveLastUsedUser` 函数
- [ ] 实现 `getLastUsedUser` 函数
- [ ] 添加初始化 useEffect
- [ ] 修改 `handleUserSwitch` 函数

### 6.3 UI 细节

- [ ] 快速切换按钮样式（圆角、阴影、边框）
- [ ] 下拉菜单样式（宽度、高度、阴影）
- [ ] 当前用户高亮（背景色、对勾）
- [ ] Toast 提示样式（渐变、动画、位置）

### 6.4 动画效果

- [ ] Toast 入场动画（滑入）
- [ ] Toast 退场动画（淡出）
- [ ] 下拉菜单展开/收起动画
- [ ] 按钮悬停效果

### 6.5 功能测试

- [ ] 切换按钮始终可见
- [ ] 点击按钮展开菜单
- [ ] 点击外部关闭菜单
- [ ] 切换用户后显示 Toast
- [ ] Toast 2秒后自动消失
- [ ] 刷新页面后保持上次用户
- [ ] 数据正确隔离（错题/笔记等）
- [ ] 数据正确共享（图书馆教材）
- [ ] Dashboard 统计正确隔离

### 6.6 边界情况

- [ ] 只有一个孩子时（未来扩展）
- [ ] localStorage 不可用时的处理
- [ ] 快速连续切换（防止错误）

---

## 7. 文件清单

### 7.1 新增文件

| 文件路径 | 说明 | 预计行数 |
|---------|------|----------|
| `components/UserSwitcher.tsx` | 快速切换按钮组件 | 150-200行 |

### 7.2 修改文件

| 文件路径 | 修改内容 | 预计行数变化 |
|---------|---------|--------------|
| `components/Layout.tsx` | 集成 UserSwitcher 组件 | +10/-20 |
| `App.tsx` | 添加记忆逻辑和 Toast 状态 | +20 行 |

### 7.3 无需修改

| 文件 | 说明 |
|------|------|
| `components/Dashboard.tsx` | 统计已自动隔离 |
| 数据过滤逻辑 | 现有实现已满足需求 |

---

## 8. 技术栈

- **React Hooks**: useState, useEffect, useMemo
- **Framer Motion**: 动画效果
- **LocalStorage**: 记忆上次使用的用户
- **TypeScript**: 类型安全

---

## 9. 性能考虑

**LocalStorage 读写**：
- 同步操作，性能影响可忽略
- 容量：5-10MB
- 持久化：除非手动清除，否则永久保存

**数据过滤性能**：
- 使用 `useMemo` 缓存过滤结果
- 仅在 `currentUser.id` 变化时重新计算
- 数据量小时（<1000条），过滤性能优异

**动画性能**：
- 使用 CSS transform 和 opacity
- 硬件加速（GPU）
- 不影响页面滚动和交互

---

## 10. 用户体验改进

### 改进前
- ❌ 切换功能不明显（头像图标）
- ❌ 切换后无反馈，不确定是否成功
- ❌ 每次打开都是默认用户，需要手动切换

### 改进后
- ✅ 切换按钮明显，带文字说明
- ✅ 切换后Toast提示，明确反馈
- ✅ 记忆上次用户，打开即用

---

## 11. 设计验证

### 11.1 设计原则验证

- ✅ **KISS原则**：简单实用，无复杂权限
- ✅ **信息平等**：所有数据透明可见
- ✅ **YAGNI**：不过度设计，满足当前需求
- ✅ **向后兼容**：不破坏现有功能

### 11.2 用户需求验证

- ✅ **手动主动切换**：按钮始终可见，一键切换
- ✅ **简单快速**：2-3次点击完成切换
- ✅ **视觉反馈**：Toast提示明确
- ✅ **记忆功能**：下次打开直接进入

### 11.3 数据隔离验证

- ✅ **错题/笔记隔离**：只能看到自己的
- ✅ **图书馆共享**：所有孩子都能看到教材
- ✅ **Dashboard统计隔离**：分别计算，互不干扰

---

## 12. 后续优化方向

### 12.1 短期（本次实施）

- ✅ 创建 UserSwitcher 组件
- ✅ 实现 Toast 提示
- ✅ 添加 LocalStorage 记忆
- ✅ 测试和优化

### 12.2 中期（可选优化）

- 添加"切换动画"（页面过渡效果）
- 添加"使用统计"（记录每个孩子的使用时长）
- 优化移动端触摸体验

### 12.3 长期（待规划）

- 多孩子协作功能（如"一起学习"模式）
- 家长监控面板（查看所有孩子的进度）
- 学习报告生成（按孩子分别生成）

---

## 13. 风险评估

### 13.1 技术风险

- ⚠️ **LocalStorage 容量限制**：5-10MB，当前需求占用极小
- ⚠️ **浏览器兼容性**：LocalStorage 支持所有现代浏览器
- ⚠️ **隐私模式**：隐私模式下LocalStorage可能不可用，需处理

**缓解措施**：
- 添加 try-catch 包装 LocalStorage 操作
- 提供降级方案（无法读取时使用默认用户）

### 13.2 用户体验风险

- ⚠️ **切换频率**：可能频繁切换导致数据混乱
- ⚠️ **误操作**：孩子误点切换按钮

**缓解措施**：
- Toast 提示中包含用户名，明确当前是谁的视图
- 切换按钮位置明显但不突兀
- 可选：添加"你确定切换吗？"确认（如需要）

---

## 14. 成功标准

### 14.1 功能完整性

- [ ] 快速切换按钮正确显示当前用户
- [ ] 点击展开菜单显示所有用户
- [ ] 切换用户后显示Toast提示
- [ ] Toast 2秒后自动消失
- [ ] 刷新页面后保持上次使用的用户

### 14.2 数据正确性

- [ ] 切换到某个孩子后，只显示该孩子的数据
- [ ] Dashboard 统计正确计算当前用户的数据
- [ ] 图书馆教材所有孩子都能看到
- [ ] 不影响现有的数据隔离逻辑

### 14.3 用户体验

- [ ] 切换操作简单直观
- [ ] 视觉反馈明确清晰
- [ ] 打开应用无需手动切换
- [ ] 移动端体验良好

---

## 15. 实施计划

### 步骤1：创建 UserSwitcher 组件（30分钟）
- 编写组件代码
- 实现下拉菜单逻辑
- 添加样式和动画

### 步骤2：集成到 Layout（15分钟）
- 导入组件
- 替换现有UI
- 测试基本功能

### 步骤3：添加 Toast 提示（15分钟）
- 实现SwitchToast组件
- 添加动画效果
- 调整样式

### 步骤4：实现记忆功能（15分钟）
- 添加 LocalStorage 读写
- 修改初始化逻辑
- 修改切换处理函数

### 步骤5：测试和优化（30分钟）
- 功能测试
- 边界测试
- 性能测试
- UI调整

**总计**：约 1.5-2小时

---

## 16. 验收标准

- [ ] 所有检查清单项目通过
- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint 警告
- [ ] 功能测试通过
- [ ] 代码已提交到 git
- [ ] 文档已更新

---

**设计完成，待用户确认后实施。**
