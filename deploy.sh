#!/bin/bash

set -e

echo "🚀 开始部署智学 OS..."

# 检查环境
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件，请先创建"
    echo "提示: 复制 .env.example 并填写 API Key"
    exit 1
fi

# 检查前端目录是否存在（第一次部署需要调整目录结构）
if [ ! -d "frontend" ]; then
    echo "📦 检测到旧目录结构，正在重组..."
    mkdir -p frontend

    # 移动前端文件到 frontend 目录
    echo "移动前端文件..."
    for item in components services types.ts App.tsx index.tsx index.html vite.config.ts tsconfig.json package.json public; do
        if [ -e "$item" ]; then
            mv "$item" frontend/ 2>/dev/null || true
        fi
    done

    echo "✅ 目录结构重组完成"
fi

# 构建前端
echo "📦 构建前端..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
cd ..

# 安装后端依赖（如果需要）
echo "📦 准备后端..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

# 停止旧容器
echo "🛑 停止旧容器..."
docker-compose down 2>/dev/null || true

# 启动新容器
echo "🐳 启动 Docker 容器..."
docker-compose up -d --build

# 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 15

# 健康检查
echo "🏥 健康检查..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost/api/health >/dev/null 2>&1; then
        echo "✅ 后端健康检查通过"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "⏳ 重试中... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 5
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ 健康检查失败，请查看日志:"
    echo "   docker-compose logs backend"
    exit 1
fi

# 检查 Nginx
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo "✅ Nginx 健康检查通过"
else
    echo "⚠️  Nginx 健康检查失败，但服务可能仍在启动中"
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost"
echo "   后端: http://localhost/api/health"
echo "   AnythingLLM: http://localhost:3001"
echo ""
echo "📊 查看日志:"
echo "   docker-compose logs -f"
echo ""
echo "🛠  常用命令:"
echo "   停止: docker-compose down"
echo "   重启: docker-compose restart"
echo "   查看状态: docker-compose ps"
