#!/bin/bash

set -e

echo "🚀 开始部署智学 OS..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ================================
# 1. 环境检查
# ================================
echo "🔍 检查部署环境..."

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${RED}❌ 未找到 .env 文件${NC}"
    echo "提示: 复制 .env.example 并填写 API Key"
    echo ""
    echo "快速生成:"
    echo "  cp .env.example .env"
    echo "  # 编辑 .env 并填入 GEMINI_API_KEY"
    exit 1
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    echo "请先安装 Docker Compose"
    exit 1
fi

echo -e "${GREEN}✅ 环境检查通过${NC}"
echo ""

# ================================
# 2. 容器化编译
# ================================
echo "🏗️  开始容器化编译..."
echo ""

# 执行容器化编译脚本
if [ -f "build.sh" ]; then
    chmod +x build.sh
    ./build.sh || {
        echo -e "${RED}❌ 编译失败${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}⚠️  未找到 build.sh，跳过容器化编译${NC}"
    echo "如果是首次部署，建议先运行 ./build.sh 进行编译"
    echo ""
fi

# 验证编译产物
if [ ! -d "build-output/frontend/dist" ] || [ ! -d "build-output/backend/dist" ]; then
    echo -e "${RED}❌ 编译产物缺失${NC}"
    echo "请先运行: ./build.sh"
    exit 1
fi

echo -e "${GREEN}✅ 编译产物验证通过${NC}"
echo ""

# ================================
# 3. 停止旧容器
# ================================
echo "🛑 停止旧容器..."
docker-compose down 2>/dev/null || true
echo ""

# ================================
# 4. 启动服务
# ================================
echo "🐳 启动 Docker 容器..."
docker-compose up -d --build

echo ""
echo "⏳ 等待服务启动..."
sleep 15

# ================================
# 5. 健康检查
# ================================
echo ""
echo "🏥 执行健康检查..."
echo "--------------------------------"

MAX_RETRIES=5
RETRY_COUNT=0

# 检查后端
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端健康检查通过${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "⏳ 重试中... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 5
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ 后端健康检查失败${NC}"
    echo ""
    echo "查看日志:"
    echo "  docker-compose logs backend"
    exit 1
fi

# 检查 Nginx
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx 健康检查失败，但服务可能仍在启动中${NC}"
fi

# 检查 AnythingLLM
if curl -f http://localhost:3001 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ AnythingLLM 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  AnythingLLM 可能仍在启动中${NC}"
fi

# ================================
# 6. 部署总结
# ================================
echo ""
echo "======================================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "======================================"
echo ""
echo "📍 访问地址:"
echo "   前端:          http://localhost"
echo "   后端健康检查:   http://localhost/api/health"
echo "   AnythingLLM:   http://localhost:3001"
echo ""
echo "📊 管理命令:"
echo "   查看日志:   docker-compose logs -f"
echo "   查看状态:   docker-compose ps"
echo "   重启服务:   docker-compose restart"
echo "   停止服务:   docker-compose down"
echo ""
echo "📂 构建产物:"
echo "   前端: build-output/frontend/dist/"
echo "   后端: build-output/backend/dist/"
echo ""
echo "💡 提示:"
echo "   - 首次访问前端可能需要 1-2 分钟初始化"
echo "   - 如遇问题，查看日志: docker-compose logs -f"
echo ""
