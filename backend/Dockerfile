FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

# 编译 TypeScript
RUN npm install -D typescript && npm run build

# 清理开发依赖
RUN npm prune --production

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/index.js"]
