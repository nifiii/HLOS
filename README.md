# 智学 OS (Home-Learning-OS) 🎓

> 家庭智能学习系统 | 基于 Google Gemini 3 + AnythingLLM 构建的个性化教育数字化解决方案

**智学 OS** 是一个专为家庭教育场景设计的全栈 Web 应用。它利用 **Google Gemini 3** 的多模态能力和 **AnythingLLM** 的向量检索技术，将传统的纸质学习资料数字化，并基于学生的学习数据生成个性化的学习内容和测验。

---

## ✨ 核心功能

### 1. 多角色逻辑隔离 (Multi-Profile)
- 支持多子女家庭（如：大宝、二宝）
- 数据完全隔离：每个孩子的错题、笔记、图书、学习进度独立存储
- 快速切换身份：顶部/侧边栏一键切换当前学生视角
- 家庭共享资源：支持教材、参考书等资源共享

### 2. 智能拍题录入 (AI Capture & OCR)
- **引擎**: `gemini-3-flash-preview` (Vision)
- **功能**:
  - 自动识别图片类型（教材、笔记、错题、试卷）
  - 高精度 OCR：完美还原数学公式 (LaTeX)、保留原文排版
  - 结构化提取：自动提取学科、章节线索、知识点、标签
  - 四层提取协议：原始内容 → 红笔批注 → 学生行为 → 订正闭环

### 3. 📚 图书馆模块 (Library Hub)
- **电子书管理**:
  - 支持上传 PDF/EPUB/TXT 格式（最大 100MB）
  - AI 自动提取元数据：书名、作者、学科、类别、年级、标签
  - 智能识别章节目录结构（三级目录树）
  - 用户可手动编辑所有元数据
- **智能索引**:
  - 自动向量化图书内容到 AnythingLLM
  - 支持语义搜索和 RAG 检索
- **本地存储**:
  - 使用 IndexedDB 存储图书数据
  - 数据完全在本地，保护隐私
- **分类筛选**:
  - 按学科、类别、年级筛选
  - 全文搜索（书名、作者、标签）

### 4. 🌱 AI 学习园地 (Study Room)
- **三步骤学习流程**:
  1. **选择章节**: 三级目录树选择器，精准定位学习内容
  2. **生成课件**: AI 根据教材内容 + 历史错题生成个性化课件
  3. **配套测验**: 自动生成测验题（每知识点 2 道基础 + 1 道提高）

- **四种教学风格**:
  - 严谨讲解（系统完整，逻辑严密）
  - 故事化（生动形象，趣味性强）
  - 实践导向（大量例题，边学边练）
  - 探究式（启发思考，培养探索精神）

- **智能推荐**:
  - 基于 RAG 检索相关错题
  - 针对性加强薄弱知识点
  - 支持 Markdown 课件下载

### 5. 数字化知识库 (Knowledge Hub)
- **结构化归档**: 自动将录入内容分类为"错题本"、"笔记"、"教材库"
- **Obsidian 兼容**: 生成标准 Markdown 格式数据
- **共享/私有机制**: 支持家庭公共资源共享，个人数据私有化

### 6. 智能考场 (Smart Exam Center)
- **引擎**: `gemini-3-pro-preview` (Reasoning with Thinking Budget)
- **RAG 检索增强**: 基于学生历史错题上下文进行智能检索
- **推理命题**: AI 模仿出题人思维，针对薄弱点生成变式题
- **试卷生成**: 自动生成包含基础题、进阶题、压轴题及教师版解析

### 7. 移动端优先体验 (Mobile First)
- 完美适配 iOS/Android 手机
- 针对刘海屏优化 (`viewport-fit=cover`)
- 触控友好的操作界面与卡片式视图

---

## 🏗️ 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        云服务器 (2核4G)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Nginx     │→ │   Backend    │→ │  AnythingLLM    │    │
│  │   (80/443)  │  │   (3000)     │  │    (3001)       │    │
│  │   反向代理   │  │  Express API │  │   向量数据库     │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
│         ↓                ↓                     ↓            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  React 前端  │  │ Gemini API   │  │   LanceDB       │    │
│  │  (静态文件)  │  │  (AI引擎)    │  │  (向量存储)      │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

#### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5.0
- **样式**: Tailwind CSS (Utility-first)
- **图标**: Lucide React
- **存储**: IndexedDB (图书、用户数据本地缓存)

#### 后端
- **运行时**: Node.js 20 + Express
- **AI SDK**: Google GenAI (`@google/genai`)
- **文件解析**:
  - `pdf-parse` - PDF 解析
  - `epub2` - EPUB 解析
  - `multer` - 文件上传
- **日志**: Winston

#### AI & 向量数据库
- **LLM**: Google Gemini 3 (Flash + Pro)
- **向量化引擎**: Gemini Embedding (`text-embedding-004`)
- **RAG 平台**: AnythingLLM (开源)
- **向量存储**: LanceDB

#### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx (Alpine)
- **目标环境**: CentOS 8.2, 2核4G, 50GB 硬盘

---

## 🚀 快速开始

### 前置要求

- **操作系统**: CentOS 8.2 或其他 Linux 发行版
- **硬件配置**: 最低 2 核 4GB 内存，推荐 50GB 磁盘空间
- **软件依赖**:
  - Docker >= 20.10
  - Docker Compose >= 2.0
  - Git
- **API Key**: Google Gemini API Key (申请地址: [Google AI Studio](https://aistudio.google.com/))

### 一键部署

**步骤 1: 克隆代码**
```bash
git clone <repository-url>
cd home-learning-os
```

**步骤 2: 配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件,填入你的 API Key
nano .env
```

`.env` 文件示例:
```bash
# Google Gemini API Key (必需)
GEMINI_API_KEY=your_google_gemini_api_key_here

# AnythingLLM API Key (自动生成,可自定义)
# 生成方式: openssl rand -hex 32
ANYTHINGLLM_API_KEY=your_anythingllm_api_key_here

# 环境模式
NODE_ENV=production
```

**步骤 3: 执行部署脚本**
```bash
# 赋予执行权限
chmod +x deploy.sh

# 运行一键部署
./deploy.sh
```

部署脚本会自动：
1. 构建前端静态文件
2. 安装后端依赖
3. 启动 Docker 容器（Nginx + Backend + AnythingLLM）
4. 执行健康检查

**步骤 4: 访问应用**

部署成功后，在浏览器访问:
- **前端**: http://your-server-ip
- **后端健康检查**: http://your-server-ip/api/health
- **AnythingLLM 管理界面**: http://your-server-ip:3001

---

## 📖 详细使用说明

### 📱 移动端使用

1. **添加到主屏幕** (iOS/Android):
   - iOS: Safari → 分享 → 添加到主屏幕
   - Android: Chrome → 菜单 → 添加到主屏幕

2. **切换学生身份**:
   - 点击顶部头像图标
   - 选择大宝/二宝

3. **拍题录入**:
   - 进入"拍题"模块
   - 点击"拍照"或"上传图片"
   - 等待 AI 识别完成
   - 确认信息后归档

### 📚 图书馆使用

1. **上传电子书**:
   - 进入"图书馆"模块
   - 点击"上传图书"按钮
   - 选择 PDF/EPUB/TXT 文件
   - 等待 AI 自动提取元数据
   - 确认/编辑元数据后保存

2. **浏览图书**:
   - 使用筛选器按学科/类别/年级筛选
   - 点击图书卡片查看详情
   - 查看章节目录树

### 🌱 学习园地使用

1. **选择章节**:
   - 进入"学习园地"模块
   - 从图书列表选择教材
   - 在三级目录树中选择具体章节

2. **生成课件**:
   - 选择教学风格（严谨/故事化/实践/探究）
   - 点击"生成课件"
   - AI 会结合教材内容 + 你的历史错题生成个性化课件

3. **完成测验**:
   - 课件学习完成后，点击"生成配套测验"
   - AI 会生成针对该章节的测验题

### 🎯 考场使用

1. **生成试卷**:
   - 进入"考场"模块
   - 选择科目（如数学）
   - 输入复习重点（如"二次函数"）
   - AI 会基于你的历史错题生成试卷

2. **下载试卷**:
   - 试卷生成后，支持 Markdown 格式下载
   - 可直接打印或导入 Obsidian

---

## 🛠 系统维护

### Docker 容器管理

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f          # 全部服务
docker-compose logs -f backend  # 仅后端
docker-compose logs -f nginx    # 仅 Nginx

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新代码后重新部署
git pull
./deploy.sh
```

### 数据备份

```bash
# 备份 AnythingLLM 数据
tar -czf anythingllm-backup-$(date +%Y%m%d).tar.gz ./anythingllm-storage

# 备份前端 IndexedDB 数据（需在浏览器导出）
# 进入"设置" → "导出数据"
```

### 性能优化 (2核4G服务器)

项目已针对 2核4G 服务器进行优化:

1. **AnythingLLM 内存限制**:
   - 最大内存: 2GB
   - 预留内存: 1GB

2. **分块策略**:
   - Chunk Size: 800 tokens
   - Chunk Overlap: 150 tokens
   - 并发分块数: 2

3. **Nginx 缓存**:
   - 静态资源缓存 1 年
   - HTML 不缓存（实时更新）

### 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 容器启动失败 | 端口占用 | `sudo lsof -i :80` 检查端口，停止冲突进程 |
| 后端健康检查失败 | API Key 未配置 | 检查 `.env` 文件是否包含 `GEMINI_API_KEY` |
| AnythingLLM 无法访问 | 容器未启动 | `docker-compose logs anythingllm` 查看日志 |
| 图像识别超时 | 图片过大 | 压缩图片至 5MB 以下 |
| 内存不足 | 并发请求过多 | 调整 `docker-compose.yml` 中的内存限制 |

---

## 📁 项目结构

```
home-learning-os/
├── api/                      # Vercel Serverless Functions (备用)
│   ├── analyze-image.ts
│   ├── generate-courseware.ts
│   └── generate-assessment.ts
├── backend/                  # Node.js 后端 (主力)
│   ├── src/
│   │   ├── index.ts          # Express 入口
│   │   ├── routes/           # API 路由
│   │   │   ├── analyze.ts    # 图像分析
│   │   │   ├── courseware.ts # 课件生成
│   │   │   ├── assessment.ts # 试卷生成
│   │   │   ├── anythingllm.ts# AnythingLLM 集成
│   │   │   └── upload-book.ts# 图书上传
│   │   └── services/         # 业务逻辑
│   │       ├── bookMetadataAnalyzer.ts
│   │       ├── pdfParser.ts
│   │       └── epubParser.ts
│   ├── package.json
│   └── tsconfig.json
├── components/               # React 组件 (14个)
│   ├── Layout.tsx            # 布局框架
│   ├── Dashboard.tsx         # 数据看板
│   ├── CaptureModule.tsx     # 拍题模块
│   ├── KnowledgeHub.tsx      # 知识库
│   ├── ExamCenter.tsx        # 考场
│   ├── LibraryHub.tsx        # 图书馆
│   ├── StudyRoom.tsx         # 学习园地
│   ├── LiveTutor.tsx         # 实时语音辅导
│   ├── BookCard.tsx          # 图书卡片
│   ├── BookUploader.tsx      # 图书上传器
│   ├── BookMetadataEditor.tsx# 元数据编辑器
│   ├── ChapterSelector.tsx   # 章节选择器
│   ├── CoursewareGenerator.tsx# 课件生成器
│   └── QuizGenerator.tsx     # 测验生成器
├── services/                 # 前端服务层
│   ├── geminiService.ts      # Gemini API 客户端
│   ├── ragSearchService.ts   # RAG 搜索服务
│   ├── bookStorage.ts        # IndexedDB 图书存储
│   └── audioUtils.ts         # 语音工具
├── types.ts                  # TypeScript 类型定义
├── App.tsx                   # 应用根组件
├── index.tsx                 # 入口文件
├── index.html                # HTML 模板
├── vite.config.ts            # Vite 配置
├── docker-compose.yml        # Docker Compose 配置
├── nginx.conf                # Nginx 配置
├── deploy.sh                 # 一键部署脚本
├── .env.example              # 环境变量模板
└── README.md                 # 项目文档
```

---

## 🔒 安全性说明

### API Key 保护

- ✅ **后端**: API Key 存储在服务器环境变量,前端无法访问
- ✅ **容器隔离**: 敏感信息仅在容器内部网络传递
- ✅ **Nginx 代理**: 前端通过 `/api/*` 路由访问后端,无直连

### 数据隐私

- **本地优先**: 图书数据存储在浏览器 IndexedDB,不上传服务器
- **用户隔离**: 每个学生的数据通过 `ownerId` 严格隔离
- **可选共享**: 家长可选择将教材设为 `shared` 状态

### 注意事项

- ❌ **切勿**将 `.env` 文件提交到 Git 仓库
- ❌ **切勿**在前端代码中硬编码任何密钥
- ⚠️ 图片会上传至 Google 服务器进行 OCR,请勿上传包含敏感个人信息的图片

---

## 🌟 技术亮点

1. **四层 OCR 提取协议**:
   - 层级 1: 原始印刷内容
   - 层级 2: 红笔批改痕迹
   - 层级 3: 学生手写答案
   - 层级 4: 订正闭环判定

2. **RAG 检索增强**:
   - Gemini Embedding 向量化
   - LanceDB 高效向量存储
   - 基于语义相似度的智能检索

3. **System Instruction**:
   - 内置"资深教育数字化专家" Persona
   - 内置"资深学科命题组长" Persona
   - 确保 AI 输出的专业性和教学价值

4. **JSON Schema 约束**:
   - 强制 AI 输出符合 TypeScript 接口
   - 无需正则解析,数据稳定性高

5. **2核4G 服务器优化**:
   - Docker 内存限制
   - 分块策略优化
   - Nginx 静态资源缓存

---

## 🔧 开发指南

### 本地开发

**前端开发**:
```bash
npm install
npm run dev
# 访问 http://localhost:5173
```

**后端开发**:
```bash
cd backend
npm install
npm run dev
# 访问 http://localhost:3000
```

**AnythingLLM 本地启动**:
```bash
docker run -d \
  -p 3001:3001 \
  -e LLM_PROVIDER=gemini \
  -e GEMINI_API_KEY=your_key \
  mintplexlabs/anythingllm:latest
```

### 构建生产版本

```bash
# 前端构建
npm run build
# 输出: dist/

# 后端构建
cd backend
npm run build
# 输出: dist/
```

---

## 📊 路线图

- [x] 阶段 1: 基础架构 (✅ 已完成)
  - React 前端 + Express 后端
  - Docker 容器化部署
  - 多用户数据隔离

- [x] 阶段 2: 核心功能 (✅ 已完成)
  - 智能拍题 OCR
  - 图书馆模块
  - AI 学习园地
  - 智能考场

- [ ] 阶段 3: AnythingLLM 深度集成 (🚧 进行中)
  - PDF/EPUB/TXT 解析
  - 文档向量化索引
  - RAG 检索优化

- [ ] 阶段 4: 高级功能 (🗓️ 计划中)
  - 实时语音辅导 (LiveTutor)
  - 学习进度分析
  - 知识图谱可视化
  - 家长监控面板

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request!

**开发规范**:
- 遵循 TypeScript 严格模式
- 使用 ESLint + Prettier 格式化代码
- 提交前执行 `npm run build` 确保无编译错误

---

## 📄 License

MIT License

---

## 🙏 致谢

- [Google Gemini](https://ai.google.dev/) - 多模态 AI 引擎
- [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) - 开源 RAG 平台
- [React](https://react.dev/) - 前端框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 样式库

---

**如有问题,请提交 Issue 或联系维护者。**
