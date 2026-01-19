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
│  │  (Port 80)  │  │  (Port 3000) │  │  (Port 3001)    │    │
│  │             │  │              │  │                 │    │
│  │  静态文件   │  │  Express.js  │  │  向量数据库     │    │
│  │  反向代理   │  │  API 路由    │  │  RAG 检索       │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
│         │                 │                   │              │
│         └─────────────────┴───────────────────┘              │
│                    Docker Compose                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
                     Google Gemini API
                   (AI 推理 / OCR / 课件生成)
```

### 技术栈

**前端**:
- React 18 + TypeScript
- Tailwind CSS (Utility-first)
- Lucide React (图标库)
- React Markdown (Markdown 渲染)
- IndexedDB (本地数据存储)
- Vite (构建工具)

**后端**:
- Node.js 18+ + Express.js
- TypeScript (类型安全)
- Multer (文件上传)
- PDF-Parse (PDF 解析)
- EPUB2 (EPUB 解析)
- Google GenAI SDK (Gemini 3 集成)

**AI 引擎**:
- Google Gemini 3 Flash (OCR / 元数据提取)
- Google Gemini 3 Pro (课件生成 / 测验生成)
- AnythingLLM (向量化 / RAG 检索)

**基础设施**:
- Docker + Docker Compose
- Nginx (反向代理 + 静态文件服务)
- LanceDB (向量数据库)

---

## 🚀 云服务器部署指南

### 一、服务器要求

**最低配置**:
- CPU: 2核
- 内存: 4GB
- 硬盘: 20GB SSD
- 操作系统: Ubuntu 20.04+ / CentOS 7+

**推荐配置**:
- CPU: 4核
- 内存: 8GB
- 硬盘: 40GB SSD

**必须安装**:
- Docker
- Docker Compose
- Git

---

### 二、快速部署（一键部署）

#### 步骤 1: 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 安装 Docker Compose
sudo apt install docker-compose -y

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户加入 docker 组（可选，避免每次使用 sudo）
sudo usermod -aG docker $USER
# 注销并重新登录生效
```

#### 步骤 2: 克隆代码

```bash
# SSH 克隆
git clone git@github.com:your-username/home-learning-os.git

# 或 HTTPS 克隆
git clone https://github.com/your-username/home-learning-os.git

cd home-learning-os
```

#### 步骤 3: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env

# 填写以下信息：
# GEMINI_API_KEY=your_actual_gemini_key
# ANYTHINGLLM_API_KEY=$(openssl rand -hex 32)
```

**GEMINI_API_KEY 申请**:
1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录 Google 账号
3. 点击「Get API Key」
4. 创建新项目或选择现有项目
5. 复制生成的 API Key

**ANYTHINGLLM_API_KEY 生成**:
```bash
openssl rand -hex 32
```

#### 步骤 4: 执行部署

```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 执行一键部署
./deploy.sh
```

部署脚本会自动：
1. 检查环境配置
2. 构建前端代码
3. 启动 Docker 容器（Nginx + Backend + AnythingLLM）
4. 执行健康检查

**部署时间**: 约 5-10 分钟（取决于网络速度）

#### 步骤 5: 验证部署

访问以下地址检查服务状态：

- **前端**: `http://your-server-ip`
- **后端健康检查**: `http://your-server-ip/api/health`
- **AnythingLLM 管理界面**: `http://your-server-ip:3001`

**预期响应**:
```json
// http://your-server-ip/api/health
{
  "status": "ok",
  "timestamp": 1737292800000,
  "version": "1.0.0"
}
```

---

### 三、防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

### 四、常用运维命令

#### 查看服务状态

```bash
# 查看所有容器状态
docker-compose ps

# 查看资源使用情况
docker stats
```

#### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f anythingllm
docker-compose logs -f nginx

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

#### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart anythingllm
```

#### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除卷（清空数据）
docker-compose down -v
```

#### 更新代码并重新部署

```bash
# 拉取最新代码
git pull

# 重新部署
./deploy.sh
```

---

### 五、性能优化（2核4G 服务器）

#### 1. 启用 Swap 内存

```bash
# 创建 2G swap 文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 验证
free -h
```

#### 2. 定期清理 Docker

```bash
# 手动清理未使用的镜像、容器、网络
docker system prune -af

# 添加到 crontab（每周日凌晨2点执行）
(crontab -l 2>/dev/null; echo "0 2 * * 0 docker system prune -af") | crontab -
```

#### 3. 监控内存使用

```bash
# 查看内存使用
free -h

# 查看 Docker 容器资源使用
docker stats --no-stream

# 持续监控
watch -n 5 docker stats --no-stream
```

---

### 六、配置 HTTPS（可选但推荐）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 1. 安装 certbot
sudo apt install certbot

# 2. 停止 Nginx 容器
docker-compose stop nginx

# 3. 生成证书（替换 your-domain.com 为你的域名）
sudo certbot certonly --standalone -d your-domain.com

# 4. 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# 5. 复制证书到项目目录
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*

# 6. 修改 nginx.conf 启用 HTTPS 配置（取消 443 端口配置的注释）

# 7. 重启服务
docker-compose up -d

# 8. 配置自动续期
sudo certbot renew --dry-run
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx") | crontab -
```

---

### 七、数据备份与恢复

#### 备份 AnythingLLM 数据

```bash
# 1. 停止服务
docker-compose stop anythingllm

# 2. 备份存储目录
tar -czf anythingllm-backup-$(date +%Y%m%d-%H%M%S).tar.gz anythingllm-storage/

# 3. 重启服务
docker-compose start anythingllm

# 4. 将备份文件传输到安全位置
scp anythingllm-backup-*.tar.gz user@backup-server:/backups/
```

#### 恢复备份

```bash
# 1. 停止服务
docker-compose stop anythingllm

# 2. 删除旧数据（谨慎操作）
rm -rf anythingllm-storage/*

# 3. 解压备份
tar -xzf anythingllm-backup-YYYYMMDD-HHMMSS.tar.gz

# 4. 重启服务
docker-compose start anythingllm
```

#### 定期备份脚本

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/home-learning-os"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
docker-compose stop anythingllm
tar -czf $BACKUP_DIR/anythingllm-$DATE.tar.gz anythingllm-storage/
docker-compose start anythingllm

# 删除 30 天前的备份
find $BACKUP_DIR -name "anythingllm-*.tar.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# 添加到 crontab（每天凌晨 2 点执行）
(crontab -l 2>/dev/null; echo "0 2 * * * /path/to/backup.sh") | crontab -
```

---

### 八、故障排查

#### 问题 1: 端口占用

**症状**: 容器启动失败，提示端口已被占用

```bash
# 检查端口占用
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :3001

# 停止占用端口的进程
sudo kill -9 <PID>

# 或修改 docker-compose.yml 中的端口映射
```

#### 问题 2: 容器无法启动

**症状**: `docker-compose up -d` 失败

```bash
# 查看详细错误日志
docker-compose logs <service-name>

# 检查配置文件语法
docker-compose config

# 检查 Docker 服务状态
sudo systemctl status docker

# 重启 Docker 服务
sudo systemctl restart docker
```

#### 问题 3: 内存不足

**症状**: 容器频繁重启，系统卡顿

```bash
# 查看内存使用
free -h

# 查看 Docker 容器内存限制
docker inspect hl-anythingllm | grep -i memory

# 临时清理缓存
sudo sync && sudo sysctl -w vm.drop_caches=3

# 调整 docker-compose.yml 中的内存限制
# deploy:
#   resources:
#     limits:
#       memory: 1.5G  # 降低内存限制
```

#### 问题 4: API Key 配置错误

**症状**: 前端提示 API 错误，后端日志显示认证失败

```bash
# 检查环境变量
docker-compose exec backend env | grep GEMINI
docker-compose exec anythingllm env | grep GEMINI

# 重新设置环境变量后需要重启
docker-compose down
docker-compose up -d

# 检查 .env 文件格式（不要有多余空格）
cat .env
```

#### 问题 5: Nginx 无法访问

**症状**: 浏览器显示 502 Bad Gateway

```bash
# 检查 Nginx 日志
docker-compose logs nginx

# 检查后端是否正常运行
docker-compose ps backend
curl http://localhost:3000/api/health

# 检查 Nginx 配置
docker-compose exec nginx nginx -t

# 重启 Nginx
docker-compose restart nginx
```

#### 问题 6: 图书上传失败

**症状**: 上传 PDF/EPUB 文件时报错

```bash
# 检查文件大小限制（默认 100MB）
# 编辑 backend/src/routes/upload-book.ts 中的 fileSize 配置

# 检查 Nginx 配置中的 client_max_body_size
# 编辑 nginx.conf，确保：
# client_max_body_size 100M;

# 重启服务
docker-compose restart nginx backend
```

---

### 九、安全建议

#### 1. 定期更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. 配置防火墙

仅开放必要端口（80, 443），关闭 3000, 3001 等内部端口的外部访问

#### 3. 使用 HTTPS

生产环境必须配置 SSL 证书，保护数据传输安全

#### 4. 定期备份数据

至少每周备份一次 AnythingLLM 数据

#### 5. 监控日志异常

```bash
# 实时监控错误日志
docker-compose logs --tail=100 -f | grep -i error

# 定期检查磁盘空间
df -h
```

#### 6. 限制 SSH 访问

```bash
# 使用密钥认证
ssh-keygen -t ed25519
ssh-copy-id user@server

# 禁用密码登录
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
sudo systemctl restart sshd
```

#### 7. API Key 安全

- **切勿**将 `.env` 文件提交到 Git 仓库
- **切勿**在日志中打印 API Key
- 定期轮换 API Key

---

## 📱 使用指南

### 首次使用

1. **访问应用**: 浏览器输入 `http://your-server-ip`
2. **选择用户**: 点击头像切换学生（大宝/二宝）
3. **上传图书**:
   - 进入「图书馆」模块
   - 点击「上传图书」
   - 选择 PDF/EPUB/TXT 文件
   - 等待 AI 自动分析元数据
   - 编辑确认后保存
4. **拍题录入**:
   - 进入「拍题」模块
   - 拍照或上传图片
   - AI 自动识别并归档
5. **生成课件**:
   - 进入「学习园地」
   - 选择教材和章节
   - 选择教学风格
   - 生成个性化课件
6. **生成测验**:
   - 在课件页面继续
   - 自动生成配套测验
   - 下载 Markdown 文件

### 数据管理

- **本地存储**: 图书数据存储在浏览器 IndexedDB 中
- **云端存储**: 错题、笔记等数据可选择同步到云端
- **数据导出**: 支持导出为 Markdown 格式

---

## 🔧 本地开发

### 前置要求

- Node.js >= 18.0
- npm >= 9.0
- Google Gemini API Key

### 开发步骤

```bash
# 1. 克隆代码
git clone <repository-url>
cd home-learning-os

# 2. 安装前端依赖
npm install

# 3. 安装后端依赖
cd backend
npm install
cd ..

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 填写 GEMINI_API_KEY

# 5. 启动后端
cd backend
npm run dev
# 后端运行在 http://localhost:3000

# 6. 启动前端（新终端）
npm run dev
# 前端运行在 http://localhost:5173
```

### 构建生产版本

```bash
# 构建前端
npm run build

# 构建后端
cd backend
npm run build
```

---

## 📊 系统监控

### Prometheus + Grafana（可选）

```bash
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [Google Gemini](https://ai.google.dev/) - 强大的多模态 AI 引擎
- [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) - 优秀的私有化 RAG 解决方案
- [React](https://react.dev/) - 现代化的前端框架
- [Tailwind CSS](https://tailwindcss.com/) - 高效的 CSS 框架

---

## 📞 联系方式

- 项目地址: [GitHub Repository]
- 问题反馈: [Issues]
- 设计文档: [docs/plans/2026-01-19-图书馆与AI学习园地-design.md]

---

**Made with ❤️ for family education**
