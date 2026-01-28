# ================================
# 阶段 1: 后端构建阶段
# ================================
FROM node:20-alpine AS backend-builder

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY backend/package*.json ./

# 安装构建依赖 (canvas/pdf-img-convert 需要)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# 安装依赖（包括 devDependencies 用于构建）
RUN npm config set registry https://registry.npmmirror.com && \
    npm install

# 复制源代码（包含 types.ts）
COPY backend/src ./src
COPY backend/tsconfig.json ./

# 执行 TypeScript 编译
RUN npm run build

# 验证构建结果
RUN ls -lh dist/ && \
    du -sh dist/

# ================================
# 阶段 2: 生产运行镜像
# ================================
FROM node:20-alpine AS production

WORKDIR /app

# 只复制 package.json 和 package-lock.json
COPY backend/package*.json ./

# 仅安装生产依赖
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --omit=dev && \
    npm cache clean --force

# 安装运行时依赖 (pdftoppm)
RUN apk add --no-cache poppler-utils

# 从构建阶段复制编译后的代码
COPY --from=backend-builder /app/dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

# 启动命令
CMD ["node", "dist/index.js"]
