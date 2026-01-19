# 智学 OS (Home-Learning-OS) 🎓

> 家庭混合云端学习系统 | 基于 Google Gemini 3 构建的个性化教育数字化解决方案

**智学 OS** 是一个专为家庭教育场景设计的 Web 应用程序。它利用 **Google Gemini 3** 的多模态视觉能力（Vision）和强推理能力（Reasoning），将传统的纸质学习资料（教材、手写笔记、错题试卷）转化为结构化的数字资产，并能基于学生的历史错题数据，智能生成个性化的复习试卷。

---

## 📚 核心功能

### 1. 多角色逻辑隔离 (Multi-Profile)
- 支持多子女家庭（如：大宝、二宝）。
- 数据完全隔离：每个孩子的错题、笔记、学习进度独立存储。
- 快速切换身份：移动端顶部/侧边栏一键切换当前学生视角。

### 2. 智能拍题录入 (AI Capture & OCR)
- **引擎**: `gemini-3-flash-preview` (Vision)。
- **功能**:
  - 自动识别图片类型（教材、笔记、错题、试卷）。
  - **高精度 OCR**: 完美还原数学公式 (LaTeX)、保留原文排版。
  - **结构化提取**: 自动提取学科、章节线索、标签。

### 3. 数字化知识库 (Knowledge Hub)
- **结构化归档**: 自动将录入内容分类为“错题本”、“笔记”、“教材库”。
- **Obsidian 兼容**: 生成标准 Markdown 格式数据，设计理念上可直接对接本地 Obsidian 知识库 (Vault)。
- **共享/私有机制**: 支持家庭公共资源（如教辅书）共享，个人错题私有化。

### 4. 智能考场 (Smart Exam Center)
- **引擎**: `gemini-3-pro-preview` (Reasoning with Thinking Budget)。
- **功能**:
  - **RAG (检索增强)**: 基于学生历史错题上下文进行检索。
  - **推理命题**: 不仅仅是题库抽题，AI 会“模仿”出题人思维，针对薄弱点生成变式题（举一反三）。
  - **试卷生成**: 自动生成包含基础题、进阶题、压轴题及**教师版解析**的完整试卷。

### 5. 移动端优先体验 (Mobile First)
- 完美适配 iOS/Android 手机。
- 针对刘海屏优化 (`viewport-fit=cover`)。
- 触控友好的操作界面与卡片式视图。

---

## 🛠 技术架构

本项目采用现代化的前端技术栈，利用 ESM 直接在浏览器中运行（或通过简单构建），保持轻量级与高性能。

- **前端框架**: React 18 + TypeScript
- **样式库**: Tailwind CSS (CDN Runtime / Utility-first)
- **AI 核心**: Google GenAI SDK (`@google/genai`)
- **图标库**: Font Awesome 6
- **构建/运行**: ES Modules (via `importmap`)，无复杂 Webpack 配置，即开即用。

---

## 🌟 项目亮点

1.  **Gemini 3 深度应用**:
    - 利用 **Flash 模型** 的低延迟处理视觉识别。
    - 利用 **Pro 模型** 的 `thinkingBudget` (思维预算) 功能，在生成试卷前进行深度教学推理。
2.  **System Instruction (系统指令)**:
    - 内置“资深教育数字化专家”和“资深学科命题组长”两大 Persona，确保 AI 输出的专业性。
3.  **JSON Schema 约束**:
    - 摒弃传统的正则提取，强制模型输出符合 TypeScript 接口定义的 JSON 数据，极大提高了系统的稳定性。
4.  **响应式设计**:
    - 桌面端：双栏布局，宽表格视图，侧边导航。
    - 移动端：底部导航，卡片视图，针对触摸优化的交互。

---

## 🚀 基础环境与部署说明

### 1. 前置要求

*   **API Key**: 你需要一个 Google Gemini API Key（支持 Gemini 1.5/2.5/3.0 系列模型）。
    *   申请地址: [Google AI Studio](https://aistudio.google.com/)
*   **Node.js**: 版本 >= 16.0 (用于本地开发和构建)

### 2. 本地开发步骤

**步骤 A: 获取代码**
```bash
git clone <repository-url>
cd home-learning-os
npm install
```

**步骤 B: 配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local 填入你的 Gemini API Key
# GEMINI_API_KEY=your_actual_key_here
```

**步骤 C: 启动开发服务器**
```bash
npm run dev
```

然后访问 `http://localhost:5173`。

---

### 3. 部署到 Vercel (生产环境推荐)

本项目已完成安全架构重构,使用 **Vercel Serverless Functions** 保护 API Key。

#### 架构说明

```
原架构 (不安全):
浏览器 → Google Gemini API (API Key 暴露在前端代码)

新架构 (安全):
浏览器 → Vercel Functions (/api/*) → Google Gemini API
         ↑ API Key 存储在服务器环境变量,前端无法访问
```

#### 部署步骤

**方式 1: 通过 Vercel CLI**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 配置环境变量
vercel env add GEMINI_API_KEY
# 输入你的 Google Gemini API Key
```

**方式 2: 通过 GitHub 集成 (推荐)**

1. 将代码推送到 GitHub 仓库
2. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
3. 点击 "Import Project" → 选择你的 GitHub 仓库
4. 在项目设置中添加环境变量:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 你的 Google Gemini API Key
5. 点击 "Deploy"

#### 验证部署安全性

部署完成后,必须验证 API Key 未暴露:

```bash
# 1. 访问部署的网站
# 2. 打开浏览器开发者工具 (F12)
# 3. 切换到 Sources 标签
# 4. 搜索 "GoogleGenAI" 或 "apiKey"
# 5. 确认前端代码中不包含任何密钥字符串
```

**正确结果**: 只能看到 `fetch('/api/analyze-image'` 等 API 调用,没有任何明文密钥。

---

### 4. 本地测试 Serverless Functions

使用 Vercel CLI 本地模拟生产环境:

```bash
# 安装依赖
npm install

# 启动 Vercel 开发服务器 (会自动加载 .env.local)
vercel dev

# 测试 API
curl -X POST http://localhost:3000/api/analyze-image \
  -H "Content-Type: application/json" \
  -d '{"base64Image":"data:image/jpeg;base64,..."}'
```

---

## 📖 使用与维护说明

### 📱 App 使用指南

1.  **初始设置**:
    - 打开 App，默认进入“看板”。
    - 点击侧边栏（桌面）或 顶部头像（手机）切换当前学生（大宝/二宝）。
2.  **录入题目 (拍题)**:
    - 进入“拍题”模块。
    - 手机端直接调用摄像头拍照，或上传图片。
    - 确认图片清晰，点击“立即处理”。
    - 系统会自动分析是错题还是笔记，并归档。
3.  **生成试卷**:
    - 积累一定的错题后，进入“考场”模块。
    - 选择科目（如数学）和复习重点（如“二次函数”）。
    - 点击“立即生成试卷”。
    - AI 会基于历史错题生成一份新的 Markdown 试卷。

### 🗄️ 知识库维护 (Obsidian 集成概念)

本项目设计理念是作为 **Obsidian 的前端采集器**。虽然 Web 端无法直接写入本地文件系统（受浏览器沙箱限制），但数据流向设计如下：

1.  **数据导出**:
    - 在“题库”列表，点击 `Obsidian` 按钮（目前为模拟），在实际生产环境中，这可以实现为：
        - 复制 Markdown 到剪贴板。
        - 调用 Obsidian URI Scheme (`obsidian://new?vault=my_vault&name=xxx&content=xxx`) 直接唤起本地 Obsidian 并写入文件。
2.  **目录规范**:
    建议在本地 Obsidian 仓库中建立如下文件夹结构：
    ```text
    My_Vault/
    ├── Students/
    │   ├── DaBao/
    │   │   ├── Wrong_Problems/  (错题)
    │   │   ├── Notes/           (笔记)
    │   │   └── Exams/           (生成的试卷)
    │   └── ErBao/
    └── Public_Library/          (教材/参考书)
    ```

### ⚠️ 注意事项

*   **API 费用**: Gemini 3 Preview 目前可能免费或计费，请关注 Google AI Studio 的计费说明。
*   **数据隐私**: 图片会上传至 Google 服务器进行处理，请勿上传包含敏感个人隐私（如身份证、家庭住址）的图片。
*   **安全警告**:
    - 本项目已使用 Serverless Functions 架构保护 API Key
    - **切勿**将 `.env.local` 提交到 Git 仓库
    - **切勿**在前端代码中硬编码任何密钥
    - 部署后务必验证前端 bundle 不包含明文密钥

---

## 🔒 安全架构说明

### 为什么需要 Serverless Functions?

**问题**: 在纯前端项目中,所有通过环境变量注入的密钥都会在构建时被硬编码到 JavaScript 文件中。

**原因**: Vite 的 `import.meta.env.*` 和 `define` 配置本质是**编译时字符串替换**,不是运行时读取。

**验证方式**:
```bash
npm run build
grep -r "your_api_key" dist/  # 会找到明文密钥
```

**解决方案**: 使用 Vercel Serverless Functions 作为代理层:

| 架构 | API Key 位置 | 安全性 |
|-----|-------------|--------|
| 纯前端 | 打包在 JS bundle | ❌ 任何人都可通过开发者工具查看 |
| Serverless | 服务器环境变量 | ✅ 前端无法访问 |

### 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: Vercel Serverless Functions (Node.js)
- **AI引擎**: Google Gemini 3 (Flash + Pro)
- **部署**: Vercel (全球 CDN + Serverless 计算)

---

**License**: MIT
