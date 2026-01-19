# 容器化编译指南

本文档说明如何使用 Docker 容器化编译前后端代码，解决 Node.js 版本兼容性问题。

---

## 📋 问题背景

### 原始问题

在服务器直接执行 `npm run build` 时遇到以下错误：

```
SyntaxError: Unexpected token ?
    at Module._compile (internal/modules/cjs/loader.js:723:23)
```

**根本原因**:
- 服务器 Node.js 版本过低（v10.x）
- TypeScript 5.2.2 使用了 ES2020 的空值合并运算符 `??`
- Node.js v10 不支持 ES2020 语法

### 解决方案

使用 **Docker 多阶段构建**，在容器内使用 Node.js 20 进行编译，编译完成后：
1. 将构建产物复制到宿主机
2. 自动销毁编译容器
3. 仅保留编译后的静态文件和 JS 代码

---

## 🏗️ 容器化编译架构

### 前端编译流程

```
┌────────────────────────────────────────────────────┐
│ 阶段 1: frontend-builder (Node.js 20)              │
│ ------------------------------------------------   │
│ 1. 安装依赖 (npm install)                         │
│ 2. 编译 TypeScript (tsc)                          │
│ 3. 构建 Vite 静态资源 (vite build)                │
│ 4. 输出: /app/dist/                               │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ 复制产物到宿主机                                    │
│ docker cp <container>:/app/dist build-output/...  │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ 销毁编译容器                                        │
│ docker rm <container>                             │
└────────────────────────────────────────────────────┘
```

### 后端编译流程

```
┌────────────────────────────────────────────────────┐
│ 阶段 1: backend-builder (Node.js 20)               │
│ ------------------------------------------------   │
│ 1. 安装依赖 (npm install)                         │
│ 2. 编译 TypeScript (tsc)                          │
│ 3. 输出: /app/dist/                               │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ 阶段 2: production (Node.js 20-alpine)             │
│ ------------------------------------------------   │
│ 1. 仅安装生产依赖 (--omit=dev)                    │
│ 2. 从 builder 复制 dist/                          │
│ 3. 创建非 root 用户                                │
│ 4. 最终镜像大小 < 200MB                            │
└────────────────────────────────────────────────────┘
```

---

## 🚀 快速使用

### 一键编译

```bash
# 赋予执行权限
chmod +x build.sh

# 执行容器化编译
./build.sh
```

脚本会自动：
1. 构建前端编译容器
2. 复制前端产物到 `build-output/frontend/dist/`
3. 构建后端编译容器
4. 复制后端产物到 `build-output/backend/dist/`
5. 销毁所有编译容器
6. 生成构建报告 `build-output/build-report.txt`

### 一键部署

```bash
# 赋予执行权限
chmod +x deploy.sh

# 执行部署（包含自动编译）
./deploy.sh
```

部署脚本会：
1. 检查环境（Docker, Docker Compose, .env）
2. 调用 `build.sh` 进行容器化编译
3. 启动 Docker Compose 服务
4. 执行健康检查

---

## 📂 文件结构

### Dockerfile 文件

```
项目根目录/
├── Dockerfile.frontend          # 前端多阶段构建配置
├── backend/
│   └── Dockerfile               # 后端多阶段构建配置
├── build.sh                     # 容器化编译脚本
├── deploy.sh                    # 一键部署脚本
└── docker-compose.yml           # 服务编排配置
```

### 编译产物位置

```
build-output/
├── frontend/
│   └── dist/                    # 前端静态文件
│       ├── index.html
│       ├── assets/
│       │   ├── index-*.js
│       │   └── index-*.css
│       └── ...
├── backend/
│   └── dist/                    # 后端编译后的 JS
│       ├── index.js
│       ├── routes/
│       └── services/
└── build-report.txt             # 构建报告
```

---

## 🔧 手动编译（高级用法）

### 仅编译前端

```bash
# 构建前端编译镜像
docker build \
  --target frontend-builder \
  --tag hl-frontend-builder:latest \
  -f Dockerfile.frontend \
  .

# 从容器复制产物
CONTAINER_ID=$(docker create hl-frontend-builder:latest)
docker cp ${CONTAINER_ID}:/app/dist ./build-output/frontend/
docker rm ${CONTAINER_ID}

# 清理镜像
docker rmi hl-frontend-builder:latest
```

### 仅编译后端

```bash
# 构建后端编译镜像
docker build \
  --target backend-builder \
  --tag hl-backend-builder:latest \
  --file backend/Dockerfile \
  backend/

# 从容器复制产物
CONTAINER_ID=$(docker create hl-backend-builder:latest)
docker cp ${CONTAINER_ID}:/app/dist ./build-output/backend/
docker rm ${CONTAINER_ID}

# 清理镜像
docker rmi hl-backend-builder:latest
```

---

## 🐳 Dockerfile 详解

### 前端 Dockerfile.frontend

```dockerfile
# 阶段 1: 构建阶段
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# 复制依赖文件并安装
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm install

# 复制源代码
COPY components ./components
COPY services ./services
COPY types.ts App.tsx index.tsx index.html ./
COPY vite.config.ts tsconfig.json ./

# 执行构建
RUN npm run build

# 验证构建结果
RUN ls -lh dist/ && du -sh dist/
```

**关键点**:
- 使用 `node:20-alpine` 确保 Node.js 版本正确
- 使用国内镜像加速 `registry.npmmirror.com`
- 只保留构建阶段，不创建运行镜像

### 后端 backend/Dockerfile

```dockerfile
# 阶段 1: 构建阶段
FROM node:20-alpine AS backend-builder

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm install

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

# 阶段 2: 生产运行镜像
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --omit=dev && \
    npm cache clean --force

# 从构建阶段复制产物
COPY --from=backend-builder /app/dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**关键点**:
- 多阶段构建分离编译和运行环境
- 生产镜像仅包含必要依赖（`--omit=dev`）
- 使用非 root 用户运行（安全最佳实践）

---

## 📊 编译性能

### 首次编译

| 阶段 | 耗时 | 磁盘占用 |
|------|------|----------|
| 前端依赖安装 | ~2 分钟 | 300MB |
| 前端 TypeScript 编译 | ~30 秒 | - |
| 前端 Vite 构建 | ~1 分钟 | - |
| 前端产物大小 | - | ~5MB |
| 后端依赖安装 | ~1 分钟 | 150MB |
| 后端 TypeScript 编译 | ~15 秒 | - |
| 后端产物大小 | - | ~500KB |
| **总耗时** | **~5 分钟** | **~460MB** |

### 增量编译

如果 Docker 层缓存未失效，后续编译可缩短至 **1-2 分钟**。

---

## 🛠 故障排查

### 问题 1: 编译容器启动失败

**症状**: `docker build` 报错

**排查步骤**:
```bash
# 检查 Docker 版本
docker --version

# 检查镜像拉取
docker pull node:20-alpine

# 查看构建日志
docker build -f Dockerfile.frontend . --progress=plain
```

### 问题 2: 依赖安装超时

**症状**: `npm install` 长时间无响应

**解决方案**:
```bash
# 编辑 Dockerfile，增加超时时间
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000 && \
    npm install
```

### 问题 3: 磁盘空间不足

**症状**: `no space left on device`

**解决方案**:
```bash
# 清理 Docker 缓存
docker system prune -af

# 检查磁盘空间
df -h

# 清理旧的编译产物
rm -rf build-output/
```

### 问题 4: 编译产物缺失

**症状**: `build-output/` 目录为空

**排查步骤**:
```bash
# 检查编译日志
./build.sh 2>&1 | tee build.log

# 手动进入容器查看
docker run -it hl-frontend-builder:latest sh
ls -la /app/dist/
```

---

## 🔒 安全建议

### 多阶段构建的安全优势

1. **隔离编译环境**:
   - 编译容器与运行容器完全隔离
   - 编译工具（TypeScript, Vite）不包含在最终镜像中

2. **减少攻击面**:
   - 生产镜像仅包含运行时依赖
   - 使用非 root 用户运行后端服务

3. **依赖安全扫描**:
   ```bash
   # 扫描生产镜像
   docker scan hl-backend:latest
   ```

### 防止密钥泄露

**错误示范** (❌):
```dockerfile
# 不要在 Dockerfile 中硬编码 API Key
ENV GEMINI_API_KEY=AIzaSy...
```

**正确做法** (✅):
```bash
# 使用 .env 文件管理密钥
# docker-compose.yml 会自动加载
```

---

## 📚 扩展阅读

- [Docker 多阶段构建最佳实践](https://docs.docker.com/build/building/multi-stage/)
- [Node.js Docker 化指南](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Vite 构建优化](https://vitejs.dev/guide/build.html)

---

## 🆘 获取帮助

### 生成诊断报告

```bash
cat > /tmp/build-diagnosis.sh <<'EOF'
#!/bin/bash
echo "=== Docker 版本 ==="
docker --version
docker-compose --version

echo -e "\n=== 磁盘空间 ==="
df -h

echo -e "\n=== Docker 镜像 ==="
docker images | grep hl-

echo -e "\n=== 编译产物 ==="
ls -lh build-output/*/dist/ 2>/dev/null || echo "无编译产物"

echo -e "\n=== 最近构建日志 ==="
tail -50 build.log 2>/dev/null || echo "无构建日志"
EOF

chmod +x /tmp/build-diagnosis.sh
bash /tmp/build-diagnosis.sh > /tmp/build-diagnosis.log
```

### 联系支持

- **项目地址**: <your-repo-url>
- **问题反馈**: <your-issues-url>
- **技术文档**: docs/

---

**提示**: 如遇编译问题，请优先查看 `build-output/build-report.txt` 了解构建详情。
