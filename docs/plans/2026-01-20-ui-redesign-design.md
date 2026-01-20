# 智学 OS UI 重设计方案

**创建日期：** 2026-01-20
**目标用户：** 小学生、初中生、高中生
**设计目标：** 温暖活泼，激发求知欲和探索欲

---

## 一、设计系统基础 (Design System Foundation)

### 1.1 配色方案

**主色调**
- **天空蓝** `#4A90E2` - 代表知识的天空，清新明亮
- **辅助色：薄荷绿** `#5FD4A0` - 代表成长，温和护眼
- **强调色：日落橙** `#FFB84D` - 重要提示和成就反馈
- **背景色：米白** `#F8F9FA` - 温暖柔和，减少纯白刺眼感

**学科色彩系统**
- 数学：海洋蓝 `#3B82F6`
- 语文：樱花粉 `#FB7185`
- 英语：紫罗兰 `#A78BFA`
- 科学：森林绿 `#10B981`

**状态色彩**
- 成功/已掌握：薄荷绿 `#5FD4A0`
- 警告/待复习：日落橙 `#FFB84D`
- 错误：珊瑚红 `#F87171`
- 信息：天空蓝 `#4A90E2`

### 1.2 字体系统

```css
/* 标题 */
font-weight: 600;
font-size: 24px-32px;

/* 正文 */
font-weight: 400;
font-size: 14px-16px;
line-height: 1.6;

/* 说明文字 */
font-size: 12px-14px;
color: #6B7280;
```

### 1.3 圆角和阴影

**圆角规范**
- 大卡片：16px
- 标准按钮：12px
- 输入框：8px
- 标签徽章：6px

**阴影规范**
```css
/* 标准卡片 */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

/* 悬停卡片 */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

/* 弹出层 */
box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
```

### 1.4 间距系统

基于 8px 网格系统：
- 极小：4px
- 小：8px
- 标准：16px
- 中：24px
- 大：32px
- 极大：48px

---

## 二、核心组件设计规范

### 2.1 按钮系统

**主要按钮 (Primary Button)**
```tsx
className="bg-sky-500 text-white px-6 py-3 rounded-xl
hover:bg-sky-600 hover:-translate-y-0.5
transition-all duration-150 shadow-lg"
```

**次要按钮 (Secondary Button)**
```tsx
className="bg-transparent border-2 border-sky-500 text-sky-500
px-6 py-3 rounded-xl hover:bg-sky-50
transition-all duration-150"
```

**成功按钮 (Success Button)**
```tsx
className="bg-green-400 text-white px-6 py-3 rounded-xl
hover:bg-green-500 transition-all duration-150"
```

**尺寸规范**
- 大按钮：高度 48px，用于主要操作
- 中按钮：高度 40px，用于次要操作
- 小按钮：高度 32px，用于辅助操作

### 2.2 卡片系统

**标准卡片**
```tsx
className="bg-white rounded-2xl shadow-md p-6
hover:shadow-lg hover:scale-[1.02]
transition-all duration-300"
```

**卡片头部**
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    {/* 彩色图标 */}
    <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
      <Icon className="text-sky-500" size={20} />
    </div>
    {/* 标题 */}
    <h3 className="text-lg font-semibold">标题</h3>
  </div>
  {/* 右侧操作 */}
  <button>...</button>
</div>
```

### 2.3 导航标签

**Tab 切换**
```tsx
<div className="flex gap-6 border-b border-gray-200">
  {tabs.map(tab => (
    <button
      className={`pb-3 px-2 text-sm font-medium transition-colors
        ${active ? 'text-sky-500 border-b-2 border-sky-500' : 'text-gray-500'}`}
    >
      {tab.icon}
      <span>{tab.label}</span>
    </button>
  ))}
</div>
```

### 2.4 输入框

```tsx
className="w-full h-11 px-4 rounded-lg border border-gray-300
focus:border-sky-500 focus:ring-2 focus:ring-sky-100
transition-all duration-150"
```

---

## 三、整体布局设计

### 3.1 顶部导航栏

**所有设备通用**
- 高度：64px，固定顶部
- 背景：白色半透明毛玻璃 `backdrop-blur-md bg-white/80`
- 滚动时显示阴影

**布局结构**
```tsx
<header className="fixed top-0 w-full h-16 backdrop-blur-md bg-white/80 z-50">
  <div className="h-full px-4 flex items-center justify-between">
    {/* 左侧：Logo */}
    <div className="flex items-center gap-2">
      <Logo />
      <span className="text-lg font-semibold">智学 OS</span>
    </div>

    {/* 中间：页面标题（仅移动端） */}
    <h1 className="md:hidden font-medium">当前页面</h1>

    {/* 右侧：用户切换 */}
    <UserSwitcher />
  </div>
</header>
```

### 3.2 侧边栏导航（桌面/平板横屏）

**尺寸**
- 展开宽度：280px
- 收起宽度：64px

**导航项设计**
```tsx
<nav className="w-70 h-screen fixed left-0 top-16 bg-white border-r">
  {menuItems.map(item => (
    <a className={`flex items-center gap-4 px-6 py-4
      hover:bg-gray-50 transition-colors
      ${active ? 'bg-sky-50 border-l-4 border-sky-500' : ''}`}>
      {/* 彩色图标 */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center"
           style={{backgroundColor: item.color + '20'}}>
        <item.icon className="text-current" style={{color: item.color}} />
      </div>
      {/* 文字 */}
      <span className="font-medium">{item.label}</span>
    </a>
  ))}
</nav>
```

### 3.3 底部导航栏（手机/小屏平板）

**尺寸**
- 高度：72px（含安全区域）
- 固定底部

**导航项设计**
```tsx
<nav className="fixed bottom-0 w-full h-18 bg-white border-t safe-area-bottom">
  <div className="flex justify-around items-center h-full">
    {navItems.map(item => (
      <button className="flex flex-col items-center gap-1 px-4 py-2">
        <item.icon
          size={24}
          className={`transition-all ${active ? 'scale-120 text-sky-500' : 'text-gray-500'}`}
        />
        <span className={`text-xs ${active ? 'font-semibold text-sky-500' : 'text-gray-500'}`}>
          {item.label}
        </span>
      </button>
    ))}
  </div>
</nav>
```

### 3.4 主内容区

```tsx
<main className="
  pt-16 pb-20 md:pb-8 md:pl-70
  min-h-screen bg-gradient-to-b from-gray-50 to-gray-100
">
  <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
    {/* 页面内容 */}
  </div>
</main>
```

---

## 四、关键页面设计

### 4.1 Dashboard 首页

**欢迎区**
```tsx
<section className="bg-gradient-to-r from-sky-400 to-green-400
  rounded-3xl p-8 mb-6 text-white relative overflow-hidden">
  {/* 背景装饰：云朵插画 */}
  <div className="absolute top-0 right-0 opacity-20">
    <CloudIllustration />
  </div>

  <div className="relative z-10">
    <h1 className="text-3xl font-bold mb-2">早安，大宝！</h1>
    <p className="text-white/90">今天是 {currentDate}</p>
  </div>

  {/* 右上角：学习时长圆环 */}
  <div className="absolute top-8 right-8">
    <CircularProgress value={75} label="今日学习" />
  </div>
</section>
```

**统计卡片**
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {stats.map(stat => (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
           style={{backgroundColor: stat.color + '20'}}>
        <stat.icon className="text-current" style={{color: stat.color}} size={24} />
      </div>
      <div className="text-3xl font-bold mb-1">{stat.value}</div>
      <div className="text-sm text-gray-600">{stat.label}</div>
      {/* 趋势箭头 */}
      {stat.trend && (
        <div className="flex items-center gap-1 mt-2 text-xs text-green-500">
          <TrendingUp size={14} />
          <span>+{stat.trend}%</span>
        </div>
      )}
    </div>
  ))}
</div>
```

**最近学习时间轴**
```tsx
<section className="bg-white rounded-2xl p-6 shadow-md mb-6">
  <h2 className="text-xl font-semibold mb-4">最近学习</h2>
  <div className="space-y-4">
    {activities.map((activity, index) => (
      <div className="flex gap-4">
        {/* 时间轴圆点 */}
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full"
               style={{backgroundColor: activity.color}} />
          {index < activities.length - 1 && (
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
</section>
```

**快捷入口**
```tsx
<section className="bg-white rounded-2xl p-6 shadow-md">
  <h2 className="text-xl font-semibold mb-4">快捷入口</h2>
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {shortcuts.map(item => (
      <button className="p-6 rounded-xl border-2 border-gray-100
        hover:border-sky-300 hover:bg-sky-50
        transition-all duration-300 group">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center
             group-hover:rotate-6 transition-transform"
             style={{backgroundColor: item.color + '20'}}>
          <item.icon className="text-current" style={{color: item.color}} size={32} />
        </div>
        <div className="font-medium mb-1">{item.label}</div>
        <div className="text-xs text-gray-500">{item.description}</div>
      </button>
    ))}
  </div>
</section>
```

### 4.2 拍题模块 (CaptureModule)

**空状态**
```tsx
<div className="flex flex-col items-center justify-center min-h-[60vh]">
  <CameraIllustration className="w-64 h-64 mb-8" />
  <h2 className="text-2xl font-semibold mb-2">拍下错题</h2>
  <p className="text-gray-600 mb-8">AI 帮你分析薄弱点</p>

  <div className="flex gap-4">
    <button className="bg-sky-500 text-white px-8 py-4 rounded-2xl
      flex items-center gap-3 hover:-translate-y-1 transition-all shadow-lg">
      <Camera size={24} />
      <span className="font-medium">拍照</span>
    </button>
    <button className="bg-green-400 text-white px-8 py-4 rounded-2xl
      flex items-center gap-3 hover:-translate-y-1 transition-all shadow-lg">
      <Upload size={24} />
      <span className="font-medium">从相册选择</span>
    </button>
  </div>
</div>
```

**上传中状态**
```tsx
<div className="flex flex-col items-center justify-center min-h-[60vh]">
  {/* 脉冲圆环动画 */}
  <div className="relative w-32 h-32 mb-8">
    <div className="absolute inset-0 border-4 border-sky-500 rounded-full
      animate-ping opacity-75" />
    <div className="absolute inset-0 border-4 border-sky-500 rounded-full" />
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="text-sky-500 animate-spin" size={48} />
    </div>
  </div>

  <h2 className="text-2xl font-semibold mb-2">AI 正在识别中...</h2>
  <p className="text-gray-500 text-sm">识别速度受网络影响</p>

  {/* 进度提示 */}
  <div className="mt-8 w-64">
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-sky-400 to-green-400
        animate-progress" />
    </div>
  </div>
</div>
```

**结果展示**
```tsx
<div className="max-w-4xl mx-auto">
  {/* 原图缩略图 */}
  <div className="bg-white rounded-2xl p-4 shadow-md mb-6 cursor-pointer"
       onClick={openFullImage}>
    <img src={imageUrl} className="w-full rounded-xl" />
    <div className="text-center text-sm text-gray-500 mt-2">
      点击查看原图
    </div>
  </div>

  {/* 识别结果 */}
  <div className="space-y-4">
    {problems.map((problem, index) => (
      <div className="bg-white rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold">第 {index + 1} 题</span>
          <span className="px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: subjectColors[problem.subject] + '20',
                  color: subjectColors[problem.subject]
                }}>
            {problem.subject}
          </span>
        </div>

        {/* 题目内容 */}
        <div className="mb-4">
          <div className="text-gray-700 leading-relaxed">{problem.question}</div>
        </div>

        {/* 学生答案 */}
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4">
          <div className="text-sm text-red-700 font-medium mb-1">你的答案</div>
          <div className="text-gray-700">{problem.studentAnswer}</div>
        </div>

        {/* 正确答案 */}
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4">
          <div className="text-sm text-green-700 font-medium mb-1">正确答案</div>
          <div className="text-gray-700">{problem.correctAnswer}</div>
        </div>

        {/* 知识点标签 */}
        <div className="flex flex-wrap gap-2">
          {problem.knowledgePoints.map(point => (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
              {point}
            </span>
          ))}
        </div>
      </div>
    ))}
  </div>

  {/* 底部按钮 */}
  <div className="sticky bottom-4 mt-6 flex gap-4">
    <button className="flex-1 bg-sky-500 text-white py-4 rounded-2xl
      font-medium shadow-lg hover:bg-sky-600 transition-colors">
      保存到知识库
    </button>
    <button className="px-6 py-4 bg-white border-2 border-gray-300 rounded-2xl
      hover:border-gray-400 transition-colors">
      重新识别
    </button>
  </div>
</div>
```

### 4.3 知识库 (KnowledgeHub)

**筛选栏**
```tsx
<div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
  {filters.map(filter => (
    <button className={`px-6 py-2 rounded-full whitespace-nowrap transition-all
      ${active
        ? 'bg-sky-500 text-white shadow-md'
        : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
      {filter.label}
    </button>
  ))}
</div>
```

**知识卡片网格**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden
      hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer">
      {/* 顶部彩色条 */}
      <div className="h-2" style={{backgroundColor: item.subjectColor}} />

      <div className="p-6">
        {/* 头部：学科标签 + 状态 */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: item.subjectColor + '20',
                  color: item.subjectColor
                }}>
            {item.subject}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium
            ${item.status === 'mastered'
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'}`}>
            {item.status === 'mastered' ? '已掌握' : '待复习'}
          </span>
        </div>

        {/* 内容预览 */}
        <div className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">
          {item.content}
        </div>

        {/* 底部：日期 + 标签 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-1">
            <Calendar size={14} />
            {item.date}
          </span>
          <div className="flex gap-2">
            {item.tags.slice(0, 2).map(tag => (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
```

**空状态**
```tsx
<div className="flex flex-col items-center justify-center min-h-[60vh]">
  <EmptyShelfIllustration className="w-80 h-80 mb-8" />
  <h2 className="text-2xl font-semibold mb-2">知识库空空如也</h2>
  <p className="text-gray-600 mb-8">去拍题录入内容吧</p>
  <button className="bg-sky-500 text-white px-8 py-4 rounded-2xl
    font-medium shadow-lg hover:bg-sky-600 transition-colors">
    立即拍题
  </button>
</div>
```

### 4.4 图书馆 (LibraryHub)

**搜索和筛选区**
```tsx
<div className="mb-6">
  {/* 搜索框 */}
  <div className="relative mb-4">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
    <input
      className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-gray-200
        focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all"
      placeholder="搜索书名、作者..."
    />
  </div>

  {/* 筛选标签 */}
  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
    {['全部', '数学', '语文', '英语', '科学'].map(filter => (
      <button className={`px-4 py-2 rounded-full whitespace-nowrap text-sm
        ${active ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
        {filter}
      </button>
    ))}
  </div>
</div>
```

**图书网格**
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {books.map(book => (
    <div className="group cursor-pointer">
      {/* 书籍封面 */}
      <div className="relative mb-3 aspect-[3/4] rounded-2xl overflow-hidden shadow-lg
        group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br p-6 flex flex-col"
             style={{
               background: `linear-gradient(135deg, ${book.color1}, ${book.color2})`
             }}>
          {/* 书名 */}
          <h3 className="text-white font-bold text-lg leading-tight mb-2">
            {book.title}
          </h3>
          {/* 作者 */}
          <p className="text-white/80 text-sm">{book.author}</p>

          {/* 底部装饰线条 */}
          <div className="mt-auto space-y-2">
            <div className="h-1 bg-white/30 rounded" />
            <div className="h-1 bg-white/20 rounded w-3/4" />
          </div>
        </div>
      </div>

      {/* 书籍信息 */}
      <div className="px-1">
        <div className="font-medium mb-1 truncate">{book.title}</div>
        <div className="text-sm text-gray-600 mb-2">{book.grade} · {book.category}</div>

        {/* 进度条 */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full"
                 style={{width: `${book.progress}%`}} />
          </div>
          <span>{book.chapters}章</span>
        </div>
      </div>
    </div>
  ))}
</div>
```

**上传按钮（悬浮）**
```tsx
<button className="fixed bottom-24 md:bottom-8 right-8
  w-16 h-16 bg-sky-500 text-white rounded-full shadow-2xl
  hover:scale-110 hover:bg-sky-600 transition-all duration-300
  flex items-center justify-center z-40">
  <Plus size={28} />
</button>
```

**上传流程模态框**
```tsx
{/* 步骤1：上传区域 */}
<div className="border-2 border-dashed border-gray-300 rounded-3xl p-12
  hover:border-sky-400 hover:bg-sky-50 transition-all cursor-pointer">
  <div className="text-center">
    <Upload className="mx-auto mb-4 text-gray-400" size={64} />
    <p className="text-lg font-medium mb-2">点击或拖拽上传</p>
    <p className="text-sm text-gray-500">支持 PDF、EPUB、TXT（最大100MB）</p>
  </div>
</div>

{/* 步骤2：AI分析中 */}
<div className="text-center py-12">
  <BookOpen className="mx-auto mb-6 text-sky-500 animate-pulse" size={64} />
  <h3 className="text-xl font-semibold mb-2">AI 正在分析图书...</h3>
  <p className="text-gray-500">正在提取章节目录和元数据</p>
</div>

{/* 步骤3：元数据编辑 */}
<div className="grid md:grid-cols-2 gap-6">
  {/* 左侧：预览封面 */}
  <div className="bg-gradient-to-br from-sky-400 to-green-400 rounded-2xl p-8 text-white">
    <h2 className="text-2xl font-bold mb-2">{metadata.title}</h2>
    <p className="text-white/90">{metadata.author}</p>
  </div>

  {/* 右侧：表单 */}
  <div className="space-y-4">
    <input placeholder="书名" className="w-full h-12 px-4 rounded-xl border" />
    <input placeholder="作者" className="w-full h-12 px-4 rounded-xl border" />
    <select className="w-full h-12 px-4 rounded-xl border">
      <option>选择学科</option>
    </select>
    {/* ... 更多字段 */}
  </div>
</div>

{/* 步骤4：成功动画 */}
<div className="text-center py-12">
  <div className="relative">
    <CheckCircle className="mx-auto text-green-500" size={80} />
    <Confetti /> {/* 彩纸动画 */}
  </div>
  <h3 className="text-2xl font-bold mt-6 mb-2">上传成功！</h3>
  <p className="text-gray-600">图书已加入你的图书馆</p>
</div>
```

### 4.5 学习园地 (StudyRoom)

**选择图书**
```tsx
<div>
  <h1 className="text-3xl font-bold mb-2">开始学习</h1>
  <p className="text-gray-600 mb-8">选择一本教材开始今天的学习</p>

  {/* 横向滚动图书列表 */}
  <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
    {textbooks.map(book => (
      <div className="flex-shrink-0 w-48 cursor-pointer group">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg
          group-hover:shadow-xl group-hover:-translate-y-2 transition-all mb-3">
          <div className="absolute inset-0 bg-gradient-to-br p-6"
               style={{background: book.gradient}}>
            <h3 className="text-white font-bold">{book.title}</h3>
          </div>
        </div>
        <div className="px-2">
          <div className="font-medium mb-1">{book.title}</div>
          <div className="text-sm text-gray-500">已学 {book.progress}%</div>
        </div>
      </div>
    ))}
  </div>
</div>
```

**章节选择**
```tsx
<div className="grid md:grid-cols-[300px_1fr] gap-6">
  {/* 左侧：目录树 */}
  <div className="bg-white rounded-2xl p-6 shadow-md max-h-[70vh] overflow-y-auto">
    <h3 className="font-semibold mb-4">目录</h3>
    <div className="space-y-2">
      {chapters.map(chapter => (
        <div>
          {/* 一级章节 */}
          <button className={`w-full text-left px-4 py-3 rounded-xl
            hover:bg-gray-50 transition-colors flex items-center gap-2
            ${active ? 'bg-sky-50 text-sky-600 font-medium' : ''}`}>
            {chapter.hasChildren && <ChevronRight className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />}
            {chapter.learned && <CheckCircle size={16} className="text-green-500" />}
            <span>{chapter.title}</span>
          </button>

          {/* 子章节（缩进） */}
          {expanded && chapter.children && (
            <div className="ml-6 mt-1 space-y-1">
              {chapter.children.map(sub => (
                <button className="w-full text-left px-4 py-2 rounded-lg text-sm
                  hover:bg-gray-50 transition-colors">
                  {sub.title}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>

  {/* 右侧：章节详情 */}
  <div className="bg-white rounded-2xl p-8 shadow-md">
    <h2 className="text-2xl font-bold mb-4">{selectedChapter.title}</h2>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-sky-50 rounded-xl p-4">
        <div className="text-sky-600 text-sm mb-1">预计学习时间</div>
        <div className="text-2xl font-bold">{selectedChapter.duration} 分钟</div>
      </div>
      <div className="bg-orange-50 rounded-xl p-4">
        <div className="text-orange-600 text-sm mb-1">相关错题</div>
        <div className="text-2xl font-bold">{selectedChapter.wrongCount} 道</div>
      </div>
    </div>

    {/* 知识点标签云 */}
    <div className="mb-6">
      <div className="text-sm font-medium text-gray-700 mb-3">涉及知识点</div>
      <div className="flex flex-wrap gap-2">
        {selectedChapter.knowledgePoints.map(point => (
          <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm">{point}</span>
        ))}
      </div>
    </div>

    {/* 教学风格选择 */}
    <div className="mb-6">
      <div className="text-sm font-medium text-gray-700 mb-3">选择教学风格</div>
      <div className="grid grid-cols-2 gap-3">
        {teachingStyles.map(style => (
          <button className={`p-4 border-2 rounded-xl text-left
            hover:border-sky-400 hover:bg-sky-50 transition-all
            ${selected ? 'border-sky-500 bg-sky-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <style.icon size={20} />
              <span className="font-medium">{style.name}</span>
            </div>
            <p className="text-xs text-gray-600">{style.description}</p>
          </button>
        ))}
      </div>
    </div>

    {/* 生成按钮 */}
    <button className="w-full bg-sky-500 text-white py-4 rounded-2xl
      font-medium shadow-lg hover:bg-sky-600 transition-colors">
      生成个性化课件
    </button>
  </div>
</div>
```

**课件展示**
```tsx
<div className="grid lg:grid-cols-[1fr_250px] gap-6">
  {/* 左侧：课件内容 */}
  <div className="bg-white rounded-2xl p-8 shadow-md">
    {/* Markdown 渲染内容 */}
    <article className="prose prose-lg max-w-none">
      {/* 渲染的课件 */}
    </article>
  </div>

  {/* 右侧：目录导航（桌面端固定） */}
  <div className="hidden lg:block">
    <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-md">
      <h3 className="font-semibold mb-4">目录</h3>
      <nav className="space-y-2">
        {tocItems.map(item => (
          <a className={`block px-3 py-2 rounded-lg text-sm
            hover:bg-gray-50 transition-colors
            ${active ? 'bg-sky-50 text-sky-600 font-medium' : ''}`}>
            {item.title}
          </a>
        ))}
      </nav>
    </div>
  </div>
</div>

{/* 底部固定按钮 */}
<div className="sticky bottom-4 mt-6 flex gap-4">
  <button className="flex-1 bg-green-400 text-white py-4 rounded-2xl
    font-medium shadow-lg hover:bg-green-500 transition-colors
    flex items-center justify-center gap-2">
    <Sparkles size={20} />
    生成配套测验
  </button>
  <button className="px-6 py-4 bg-white border-2 border-gray-300 rounded-2xl
    hover:border-gray-400 transition-colors flex items-center gap-2">
    <Download size={20} />
    下载课件
  </button>
</div>
```

### 4.6 考场 (ExamCenter)

**创建试卷**
```tsx
<div className="max-w-2xl mx-auto">
  <div className="text-center mb-8">
    <RocketIllustration className="w-40 h-40 mx-auto mb-4" />
    <h1 className="text-3xl font-bold mb-2">智能组卷</h1>
    <p className="text-gray-600">AI 根据你的薄弱点生成专属试卷</p>
  </div>

  <div className="bg-white rounded-3xl p-8 shadow-lg space-y-6">
    {/* 科目选择 */}
    <div>
      <label className="block text-sm font-medium mb-3">选择科目</label>
      <div className="grid grid-cols-2 gap-3">
        {subjects.map(subject => (
          <button className={`p-4 rounded-2xl border-2 transition-all
            ${selected ? 'border-' + subject.color + ' bg-' + subject.color + '-50' : 'border-gray-200'}`}>
            <subject.icon size={32} className="mx-auto mb-2" />
            <div className="font-medium">{subject.name}</div>
          </button>
        ))}
      </div>
    </div>

    {/* 复习重点 */}
    <div>
      <label className="block text-sm font-medium mb-3">复习重点</label>
      <input
        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200
          focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all"
        placeholder="例如：二次函数、圆的性质"
      />
      <p className="text-xs text-gray-500 mt-2">
        💡 留空则根据所有错题智能组卷
      </p>
    </div>

    {/* 难度滑块 */}
    <div>
      <label className="block text-sm font-medium mb-3">难度设置</label>
      <div className="relative">
        <input type="range" min="1" max="3" className="w-full" />
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
        {[5, 10, 15].map(count => (
          <button className={`flex-1 py-3 rounded-xl border-2 transition-all
            ${selected ? 'border-sky-500 bg-sky-50 text-sky-600 font-medium' : 'border-gray-200'}`}>
            {count} 题
          </button>
        ))}
      </div>
    </div>

    {/* 生成按钮 */}
    <button className="w-full bg-gradient-to-r from-sky-500 to-green-400
      text-white py-4 rounded-2xl font-medium shadow-xl
      hover:shadow-2xl hover:-translate-y-1 transition-all">
      开始智能组卷
    </button>
  </div>
</div>
```

**生成中**
```tsx
<div className="flex flex-col items-center justify-center min-h-[60vh]">
  <BrainThinkingAnimation className="w-64 h-64 mb-8" />
  <h2 className="text-2xl font-semibold mb-2">AI 正在思考中...</h2>
  <p className="text-gray-600 mb-8">正在分析你的学习数据和薄弱点</p>

  {/* 进度条 */}
  <div className="w-80">
    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-sky-400 to-green-400
        transition-all duration-500"
        style={{width: `${progress}%`}} />
    </div>
    <p className="text-center text-sm text-gray-500 mt-2">{progress}%</p>
  </div>
</div>
```

**试卷展示**
```tsx
<div className="max-w-4xl mx-auto">
  {/* 试卷头部 */}
  <div className="bg-gradient-to-r from-sky-500 to-green-400
    rounded-3xl p-8 mb-6 text-white">
    <h1 className="text-3xl font-bold mb-4">数学专项测试</h1>
    <div className="flex flex-wrap gap-4 text-white/90">
      <div className="flex items-center gap-2">
        <BookOpen size={20} />
        <span>二次函数专题</span>
      </div>
      <div className="flex items-center gap-2">
        <Target size={20} />
        <span>难度：中等</span>
      </div>
      <div className="flex items-center gap-2">
        <FileText size={20} />
        <span>共 10 题</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock size={20} />
        <span>预计 45 分钟</span>
      </div>
    </div>
  </div>

  {/* 题目列表 */}
  <div className="space-y-6">
    {questions.map((question, index) => (
      <div className="bg-white rounded-2xl p-8 shadow-md">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-full
            flex items-center justify-center font-bold text-sky-600">
            {index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs
                rounded-full font-medium">
                {question.type}
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs
                rounded-full font-medium">
                {question.difficulty}
              </span>
            </div>
            <div className="text-gray-800 leading-relaxed mb-4">
              {question.content}
            </div>
            {/* 如果有图片 */}
            {question.image && (
              <img src={question.image} className="rounded-xl my-4" />
            )}
          </div>
        </div>
      </div>
    ))}
  </div>

  {/* 右侧固定：答题卡（桌面端） */}
  <div className="hidden lg:block fixed right-8 top-32 w-60">
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h3 className="font-semibold mb-4">答题卡</h3>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((_, index) => (
          <button className="w-10 h-10 rounded-lg border-2 border-gray-200
            hover:border-sky-400 hover:bg-sky-50 transition-all
            flex items-center justify-center text-sm font-medium">
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  </div>

  {/* 底部固定按钮 */}
  <div className="sticky bottom-4 mt-8 flex gap-4">
    <button className="flex-1 bg-sky-500 text-white py-4 rounded-2xl
      font-medium shadow-lg hover:bg-sky-600 transition-colors
      flex items-center justify-center gap-2">
      <Download size={20} />
      下载学生版
    </button>
    <button className="flex-1 bg-green-400 text-white py-4 rounded-2xl
      font-medium shadow-lg hover:bg-green-500 transition-colors
      flex items-center justify-center gap-2">
      <FileCheck size={20} />
      下载教师版（含答案）
    </button>
  </div>
</div>
```

---

## 五、动画和交互规范

### 5.1 时长规范

```css
/* 快速反馈 */
.transition-fast {
  transition-duration: 150ms;
}

/* 标准过渡 */
.transition-normal {
  transition-duration: 300ms;
}

/* 页面切换 */
.transition-slow {
  transition-duration: 400ms;
}

/* 特殊动画 */
.transition-special {
  transition-duration: 600ms;
}
```

### 5.2 缓动函数

```css
/* 标准缓动 */
.ease-standard {
  transition-timing-function: cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* 进入 */
.ease-in {
  transition-timing-function: cubic-bezier(0.4, 0.0, 1, 1);
}

/* 离开 */
.ease-out {
  transition-timing-function: cubic-bezier(0.0, 0.0, 0.2, 1);
}

/* 弹性 */
.ease-bounce {
  transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 5.3 关键动效实现

**按钮悬停**
```css
.button-hover {
  @apply transition-all duration-150;
}
.button-hover:hover {
  @apply -translate-y-0.5 shadow-xl;
}
```

**卡片悬停**
```css
.card-hover {
  @apply transition-all duration-300;
}
.card-hover:hover {
  @apply scale-[1.02] shadow-xl;
}
```

**页面切换**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* 页面内容 */}
</motion.div>
```

**加载动画 - 脉冲圆环**
```tsx
<div className="relative w-32 h-32">
  <div className="absolute inset-0 border-4 border-sky-500 rounded-full
    animate-ping opacity-75" />
  <div className="absolute inset-0 border-4 border-sky-500 rounded-full" />
</div>
```

**成功反馈 - 对勾动画**
```tsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{
    type: "spring",
    stiffness: 260,
    damping: 20
  }}
>
  <CheckCircle className="text-green-500" size={80} />
</motion.div>
```

**彩纸庆祝**
```tsx
import confetti from 'canvas-confetti';

confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#4A90E2', '#5FD4A0', '#FFB84D']
});
```

### 5.4 骨架屏（加载状态）

```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
  <div className="h-32 bg-gray-200 rounded mb-4" />
</div>
```

---

## 六、插画资源方案

### 6.1 推荐插画库

**开源免费**
- [unDraw](https://undraw.co/) - 扁平风格，可定制颜色
- [Storyset](https://storyset.com/) - 丰富的场景插画，支持动画
- [DrawKit](https://www.drawkit.com/) - 手绘风格

**使用方式**
1. 下载 SVG 格式
2. 使用代码编辑器替换颜色值为设计系统配色
3. 导入为 React 组件使用

### 6.2 各模块建议插画

| 模块 | 插画主题 | 建议库 |
|------|---------|--------|
| Dashboard 空状态 | 云朵、太阳、远山 | unDraw: "landscape" |
| 拍题模块 | 相机、扫描、星星 | Storyset: "camera" |
| 知识库空状态 | 空书架、等待填充 | unDraw: "bookshelf" |
| 图书馆 | 图书馆大门、阳光 | Storyset: "library" |
| 学习园地 | 书桌、台灯、植物 | unDraw: "studying" |
| 考场 | 小火箭、起飞 | Storyset: "rocket" |
| 成功提示 | 庆祝、奖杯 | unDraw: "celebration" |
| 加载中 | 书本翻页、沙漏 | Storyset: "loading" |

### 6.3 颜色替换示例

```bash
# 将 SVG 中的颜色替换为设计系统配色
sed -i 's/#6C63FF/#4A90E2/g' illustration.svg  # 替换为天空蓝
sed -i 's/#000000/#1F2937/g' illustration.svg  # 替换为深灰
```

---

## 七、响应式设计规范

### 7.1 断点系统

```javascript
const breakpoints = {
  mobile: '< 640px',
  tablet: '640px - 1024px',
  desktop: '> 1024px'
};
```

### 7.2 布局适配

**移动端 (< 640px)**
- 单列布局
- 底部导航栏
- 全宽卡片（px-4）
- 字体适当缩小

**平板 (640px - 1024px)**
- 2列网格布局
- 侧边栏可选（横屏显示）
- 中等内边距（px-6）
- 标准字体大小

**桌面 (> 1024px)**
- 3-4列网格布局
- 固定侧边栏
- 大内边距（px-8）
- 悬停效果更明显

### 7.3 关键组件适配

**导航**
- 移动端：底部导航（5个主要入口）
- 平板：可切换侧边栏
- 桌面：固定侧边栏 + 顶部栏

**卡片网格**
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
```

**图片**
```tsx
<img
  src={imageUrl}
  srcSet={`${imageUrl}?w=400 400w, ${imageUrl}?w=800 800w, ${imageUrl}?w=1200 1200w`}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

**字体缩放**
```tsx
className="text-2xl md:text-3xl lg:text-4xl"
```

---

## 八、性能优化建议

### 8.1 图片优化

```tsx
// 懒加载
import { LazyLoadImage } from 'react-lazy-load-image-component';

<LazyLoadImage
  src={imageUrl}
  effect="blur"
  placeholder={<Skeleton />}
/>
```

### 8.2 代码分割

```tsx
// 路由级代码分割
const Dashboard = lazy(() => import('./components/Dashboard'));
const CaptureModule = lazy(() => import('./components/CaptureModule'));

// 使用 Suspense 包裹
<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>
```

### 8.3 CSS 优化

```tsx
// 使用 Tailwind 的 purge 功能
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ... 只打包使用的样式
}
```

### 8.4 动画性能

```css
/* 使用 transform 而非 position */
.optimized-animation {
  transform: translateY(-2px);  /* ✅ GPU 加速 */
  /* top: -2px;  ❌ 触发重排 */
}

/* 使用 will-change 提示浏览器 */
.will-animate {
  will-change: transform, opacity;
}
```

---

## 九、技术栈和依赖

### 9.1 核心依赖

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "lucide-react": "^0.263.1",
    "react-markdown": "^8.0.7",
    "framer-motion": "^10.16.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "@fortawesome/fontawesome-free": "^6.5.1"
  }
}
```

### 9.2 需要新增的依赖

```bash
# 动画库
npm install framer-motion

# 懒加载
npm install react-lazy-load-image-component

# 彩纸动画
npm install canvas-confetti
npm install @types/canvas-confetti -D
```

### 9.3 Tailwind 配置增强

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#4A90E2',
          600: '#3b7bc9',
        },
        mint: {
          400: '#5FD4A0',
          500: '#4ec190',
        },
        sunset: {
          400: '#FFB84D',
          500: '#ffa933',
        },
        // 学科色彩
        math: '#3B82F6',
        chinese: '#FB7185',
        english: '#A78BFA',
        science: '#10B981',
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
      }
    }
  }
}
```

---

## 十、实施优先级

### Phase 1: 设计系统基础（1-2天）
- [ ] 配置 Tailwind 主题色
- [ ] 创建基础组件库（Button, Card, Input, Badge）
- [ ] 实现响应式布局框架（顶栏、侧边栏、底部导航）

### Phase 2: 核心页面重构（3-4天）
- [ ] Dashboard 首页
- [ ] 拍题模块 (CaptureModule)
- [ ] 知识库 (KnowledgeHub)

### Phase 3: 扩展模块（3-4天）
- [ ] 图书馆 (LibraryHub)
- [ ] 学习园地 (StudyRoom)
- [ ] 考场 (ExamCenter)

### Phase 4: 动画和交互（2-3天）
- [ ] 添加页面切换动画
- [ ] 实现加载状态和骨架屏
- [ ] 成功反馈动画
- [ ] 悬停效果优化

### Phase 5: 插画集成（1-2天）
- [ ] 下载并定制插画资源
- [ ] 集成到各个空状态
- [ ] 特殊场景插画（加载中、成功）

### Phase 6: 测试和优化（2-3天）
- [ ] 多设备测试（手机、平板、桌面）
- [ ] 性能优化（懒加载、代码分割）
- [ ] 动画流畅度优化
- [ ] 浏览器兼容性测试

**总预计时间：12-18天**

---

## 十一、验收标准

### 视觉标准
- [ ] 所有页面遵循统一配色系统
- [ ] 圆角、阴影、间距符合设计规范
- [ ] 字体大小层级清晰
- [ ] 插画风格统一协调

### 交互标准
- [ ] 所有悬停效果流畅（< 300ms）
- [ ] 页面切换无卡顿
- [ ] 加载状态有明确反馈
- [ ] 成功操作有庆祝动画

### 响应式标准
- [ ] 手机端（375px - 640px）完美适配
- [ ] 平板端（768px - 1024px）合理布局
- [ ] 桌面端（> 1024px）充分利用空间
- [ ] 横竖屏切换无异常

### 性能标准
- [ ] 首屏加载 < 2s
- [ ] 页面切换 < 500ms
- [ ] 动画帧率 > 50fps
- [ ] Lighthouse 性能评分 > 90

---

## 十二、后续维护

### 设计系统文档
建议在 `docs/design-system.md` 维护：
- 组件库文档
- 颜色变量表
- 间距规范表
- 常用动画示例

### 插画资源管理
```
src/
  assets/
    illustrations/
      dashboard/
        welcome.svg
        empty.svg
      capture/
        camera.svg
        loading.svg
      ...
```

### 定期审查
- 每月检查设计一致性
- 收集用户反馈优化体验
- 更新过时的视觉元素

---

**设计方案完成！**

**目标：** 将功能完善的智学 OS 打造成视觉温暖、交互友好、激发孩子学习兴趣的优质产品。

**核心价值：** 清新自然的色调 + 丰富的场景插画 + 适度的交互反馈 = 让学习变得轻松愉快
