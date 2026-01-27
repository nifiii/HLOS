# 智学 OS (Home-Learning-OS) 🎓

> 家庭智能学习系统 | 基于 Google Gemini 3 + AnythingLLM 构建的个性化教育数字化解决方案

**智学 OS** 是一个专为家庭教育场景设计的全栈 Web 应用。它利用 **Google Gemini 3** 的多模态能力和 **AnythingLLM** 的向量检索技术，将传统的纸质学习资料数字化，并基于学生的学习数据生成个性化的学习内容和测验。

---

## ✨ 核心功能

### 1. 多角色逻辑隔离 (Multi-Profile)
- 支持多子女家庭（如：大宝、二宝）
- **快速切换按钮**：顶部导航栏专属切换按钮，显示当前用户
  - 下拉菜单展示所有可选用户
  - 当前用户高亮显示（背景色 + 对勾标记）
  - 点击外部自动关闭菜单
- **视觉反馈**：切换后显示 Toast 提示（2秒自动消失）
  - 渐变背景（sky-400 to mint-400）
  - 滑入/淡出动画效果
- **智能记忆**：LocalStorage 记住上次使用的孩子
  - 下次打开自动进入上次用户的视图
  - 带错误处理（隐私模式降级）
- **数据隔离规则**：
  - **个人数据**：错题本、学习笔记、原始图片、AI课件、AI测验、OCR试卷作业、Dashboard统计
  - **共享数据**：图书馆电子教材（所有孩子可见）

### 2. 智能拍题录入 (AI Capture & OCR)
- **引擎**: `gemini-3-flash-preview` (Vision)
- **功能**:
  - 自动识别图片类型（教材、笔记、错题、试卷）
  - 高精度 OCR：完美还原数学公式 (LaTeX)、保留原文排版
  - 结构化提取：自动提取学科、章节线索、知识点、标签
  - 四层提取协议：原始内容 → 红笔批注 → 学生行为 → 订正闭环
  - **✅ 多图片上传**: 支持一次选择多张图片，自动识别为多页试卷
  - **✅ 串行处理**: 逐张进行 OCR 分析，确保质量和稳定性
  - **✅ 智能关联**: 多页试卷通过 `parentExamId` 自动关联，支持按页码排序

### 3. 📚 图书馆模块 (Library Hub)
- **电子书管理**:
  - 支持上传 PDF/EPUB/TXT 格式（最大 100MB）
  - AI 自动提取元数据：书名、作者、学科、类别、年级、标签
  - 智能识别章节目录结构（三级目录树）
  - 用户可手动编辑所有元数据
  - **✅ 分片上传**: 大文件自动分片上传（5MB/片），带进度显示和断点续传
  - **✅ 智能重试**: 上传失败自动重试（指数退避：1s, 2s, 3s）
- **智能索引**:
  - 自动向量化图书内容到 AnythingLLM
  - 支持语义搜索和 RAG 检索
- **服务端存储**:
  - 教材文件保存在服务器 `/opt/hl-os/data/originals/books/`
  - 元数据索引支持跨设备同步
  - 数据持久化，不会因浏览器清理而丢失
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

### 8. 📊 实时统计面板 (Dashboard)
- **实时数据统计**:
  - 今日收录：当天扫描的错题/笔记数量
  - 本周收录：最近7天新增数量
  - 待复习（错题）：状态为WRONG的题目总数
  - 掌握率：CORRECT/(CORRECT+WRONG)百分比，动态颜色指示
- **7天学习趋势**: 折线图可视化每日收录数量（使用 Recharts）
- **智能分析**: 基于扫描数据自动计算，无需手动记录
- **动态更新**: 添加新数据后统计自动刷新

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
- **动画**: Framer Motion (Toast 提示、页面过渡)
- **数据存储**: 服务端 API + 文件系统（见下方数据架构）

#### 后端
- **运行时**: Node.js 20 + Express
- **AI SDK**: Google GenAI (`@google/genai`)
- **文件处理**:
  - `pdf-parse` - PDF 解析
  - `epub2` - EPUB 解析
  - `multer` - 文件上传（内存存储，10MB限制）
  - **✅ 分片上传**: 自定义实现，5MB分片，自动合并
  - **✅ 豆包 (Doubao) 集成**: 使用字节跳动豆包大模型进行 PDF 元数据分析和 Markdown 转换
  - **✅ 封面提取**: 使用 `pdf-img-convert` 本地生成 PDF 缩略图 (无 Python 依赖)
- **文件清理**: 定时清理过期临时文件（24小时保留期）
- **日志**: Winston

#### 数据存储架构（三层存储）
- **层级1**: AnythingLLM (LanceDB 向量数据库)
  - 用途: RAG检索、语义搜索
  - 存储: 文本内容向量化 + 文件路径元数据
  - 配置: Gemini text-embedding-004
- **层级2**: Obsidian文件夹 (`/opt/hl-os/data/obsidian/`)
  - `Wrong_Problems/` - 错题本 Markdown
  - `No_Problems/` - 试卷作业 Markdown
  - `Courses/` - 课件测验 Markdown
  - `Books/` - 电子书 Markdown (由豆包 AI 生成)
- **层级3**: 原始文件目录 (`/opt/hl-os/data/originals/`)
  - `images/` - 原始图片（按月归档）
  - `books/` - 电子教材 PDF/EPUB
  - `covers/` - 图书封面图片

**资源占用**: ~2.5GB（1000份文档 + 100个PDF教材）

#### AI & 向量数据库
- **LLM**: 
  - Google Gemini 3 (Flash + Pro) - 视觉识别与复杂推理
  - Doubao (Doubao-pro-1.5) - 中文长文本处理与 Markdown 转换
- **向量化引擎**: Gemini Embedding (`text-embedding-004`)
- **RAG 平台**: AnythingLLM (开源)
- **向量存储**: LanceDB

#### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx (Alpine)
- **目标环境**: CentOS 8.2, 2核4G, 50GB 硬盘

---

## 🚀 快速开始

### 开发环境 (本地)

#### 前置要求
- Node.js 18+
- npm 或 yarn

#### 启动步骤

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

---

### 生产环境 (服务器部署)

#### 前置要求

- **操作系统**: CentOS 8+ / Ubuntu 20.04+
- **硬件配置**: 2核4G内存, 50GB硬盘 (推荐)
- **API Key**: [Google AI Studio](https://aistudio.google.com/)

#### 一键部署

**方式1: 已安装依赖 (推荐)**
```bash
git clone <repository-url>
cd HL-os

# 配置环境变量
cp .env.example .env
vim .env  # 填入 GEMINI_API_KEY

# 一键部署
chmod +x deploy.sh
sudo ./deploy.sh
```

**方式2: 自动安装依赖**
```bash
# 首次部署自动安装 Node.js/Nginx/Docker
sudo ./deploy.sh --with-deps
```

#### 部署架构 (混合部署优化)

部署脚本采用**混合部署方案**,相比全Docker节省~500MB内存:

| 组件 | 部署方式 | 资源占用 |
|------|----------|----------|
| 前端 | 系统 Nginx | ~10MB |
| 后端 | systemd 服务 | ~200MB |
| AnythingLLM | Docker 容器 | ~800MB |
| **总计** | | **~1GB** |

#### 访问应用

部署成功后:
- **前端**: http://your-server-ip
- **健康检查**: http://your-server-ip/health
- **后端API**: http://your-server-ip/api/

#### 管理命令

```bash
# 后端管理
journalctl -u hl-backend -f          # 查看日志
systemctl restart hl-backend       # 重启服务
systemctl status hl-backend        # 查看状态

# Nginx 管理
systemctl reload nginx             # 重载配置
tail -f /var/log/nginx/error.log    # 查看日志

# AnythingLLM 管理
docker logs -f hl-anythingllm         # 查看日志
docker restart hl-anythingllm      # 重启容器
docker stop hl-anythingllm         # 停止容器
```

#### 详细文档

- 📖 [部署指南](docs/DEPLOYMENT.md) - 完整部署步骤与故障排查
- 🔒 [安全配置](docs/SECURITY.md) - HTTPS/Nginx Basic Auth/防火墙
- 🏗️ [技术架构](docs/ARCHITECTURE.md) - 系统架构设计
- 📚 [用户手册](docs/USER_GUIDE.md) - 功能使用说明

---

## 📖 详细使用说明

### 📱 移动端使用

1. **添加到主屏幕** (iOS/Android):
   - iOS: Safari → 分享 → 添加到主屏幕
   - Android: Chrome → 菜单 → 添加到主屏幕

2. **切换学生身份**:
   - 点击顶部"切换到：XXX"按钮
   - 从下拉菜单中选择目标用户
   - 查看顶部 Toast 提示确认切换成功
   - Dashboard 数据自动更新为当前用户的统计

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
├── components/               # React 组件 (16个)
│   ├── Layout.tsx            # 布局框架
│   ├── Dashboard.tsx         # 数据看板
│   ├── CaptureModule.tsx     # 拍题模块（多图片上传）
│   ├── KnowledgeHub.tsx      # 知识库
│   ├── ExamCenter.tsx        # 考场
│   ├── LibraryHub.tsx        # 图书馆
│   ├── StudyRoom.tsx         # 学习园地
│   ├── LiveTutor.tsx         # 实时语音辅导
│   ├── UserSwitcher.tsx      # 用户切换器（快速切换按钮）
│   ├── BookCard.tsx          # 图书卡片
│   ├── BookUploader.tsx      # 图书上传器（分片上传）
│   ├── BookMetadataEditor.tsx# 元数据编辑器
│   ├── ChapterSelector.tsx   # 章节选择器
│   ├── CoursewareGenerator.tsx# 课件生成器
│   ├── QuizGenerator.tsx     # 测验生成器
│   └── UploadProgressBar.tsx # 上传进度条组件
├── hooks/                    # React Hooks
│   ├── useDashboardStats.ts  # 统计数据Hook
│   └── useChunkedUpload.ts   # 分片上传Hook ⭐NEW
├── services/                 # 前端服务层
│   ├── geminiService.ts      # Gemini API 客户端
│   ├── ragSearchService.ts   # RAG 搜索服务
│   ├── bookStorage.ts        # IndexedDB 图书存储
│   └── audioUtils.ts         # 语音工具
├── types.ts                  # TypeScript 类型定义（含分片上传类型）
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

### 访问控制

**推荐方案**: Nginx Basic Auth（家庭单密码）

- ✅ **简单可靠**: Nginx内置功能，无需额外开发
- ✅ **家庭友好**: 单一密码，全家人共享
- ✅ **信任平等**: 无角色区分，信息透明
- ✅ **HTTPS支持**: 可配合SSL证书加密传输

**快速配置**:
1. 安装工具: `sudo apt-get install apache2-utils`
2. 创建密码: `sudo htpasswd -c /etc/nginx/auth/.htpasswd family`
3. 配置Nginx: 参考 `docs/NGINX_BASIC_AUTH.md`
4. 重启服务: `sudo systemctl restart nginx`

**详细文档**: [安全配置指南](docs/SECURITY.md)

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
  - **用户切换优化** (2026-01-21)
    - 快速切换按钮（下拉菜单）
    - Toast 视觉反馈
    - LocalStorage 智能记忆
  - **访问控制简化** (2026-01-20)
    - 移除前端 PIN 认证
    - 采用 Nginx Basic Auth
    - 信任平等设计理念
  - **分片上传功能** (2026-01-21)
    - 5MB分片上传，支持大文件
    - 指数退避重试机制
    - 实时进度显示
    - 多图片串行OCR处理
    - 临时文件自动清理

- [x] 阶段 2: 核心功能 (✅ 已完成)
  - 智能拍题 OCR（支持多页试卷）
  - 图书馆模块（分片上传）
  - AI 学习园地
  - 智能考场

- [x] 阶段 3: AnythingLLM 深度集成 (✅ 已完成)
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
