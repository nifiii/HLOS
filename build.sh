#!/bin/bash

set -e

echo "🏗️  智学 OS - Docker 容器化构建脚本"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
FRONTEND_IMAGE="hl-frontend-builder"
BACKEND_IMAGE="hl-backend-builder"
OUTPUT_DIR="./build-output"

# 清理旧的构建输出
echo "🧹 清理旧的构建输出..."
rm -rf ${OUTPUT_DIR}
mkdir -p ${OUTPUT_DIR}/frontend ${OUTPUT_DIR}/backend

# ================================
# 前端构建
# ================================
echo ""
echo "📦 开始构建前端..."
echo "--------------------------------"

# 构建前端镜像（仅构建阶段）
docker build \
  --target frontend-builder \
  --tag ${FRONTEND_IMAGE}:latest \
  -f Dockerfile.frontend \
  . || {
    echo -e "${RED}❌ 前端构建失败${NC}"
    exit 1
  }

# 从构建容器复制产物到宿主机
echo "📤 复制前端构建产物到宿主机..."
CONTAINER_ID=$(docker create ${FRONTEND_IMAGE}:latest)
docker cp ${CONTAINER_ID}:/app/dist ${OUTPUT_DIR}/frontend/
docker rm ${CONTAINER_ID}

# 验证前端构建产物
if [ -f "${OUTPUT_DIR}/frontend/dist/index.html" ]; then
  echo -e "${GREEN}✅ 前端构建成功${NC}"
  echo "   产物位置: ${OUTPUT_DIR}/frontend/dist/"
  du -sh ${OUTPUT_DIR}/frontend/dist/
else
  echo -e "${RED}❌ 前端构建产物验证失败${NC}"
  exit 1
fi

# 清理前端构建镜像
docker rmi ${FRONTEND_IMAGE}:latest

# ================================
# 后端构建
# ================================
echo ""
echo "📦 开始构建后端..."
echo "--------------------------------"

# 构建后端镜像（仅构建阶段）
docker build \
  --target backend-builder \
  --tag ${BACKEND_IMAGE}:latest \
  --file backend/Dockerfile \
  backend/ || {
    echo -e "${RED}❌ 后端构建失败${NC}"
    exit 1
  }

# 从构建容器复制产物到宿主机
echo "📤 复制后端构建产物到宿主机..."
CONTAINER_ID=$(docker create ${BACKEND_IMAGE}:latest)
docker cp ${CONTAINER_ID}:/app/dist ${OUTPUT_DIR}/backend/
docker rm ${CONTAINER_ID}

# 验证后端构建产物
if [ -f "${OUTPUT_DIR}/backend/dist/index.js" ]; then
  echo -e "${GREEN}✅ 后端构建成功${NC}"
  echo "   产物位置: ${OUTPUT_DIR}/backend/dist/"
  du -sh ${OUTPUT_DIR}/backend/dist/
else
  echo -e "${RED}❌ 后端构建产物验证失败${NC}"
  exit 1
fi

# 清理后端构建镜像
docker rmi ${BACKEND_IMAGE}:latest

# ================================
# 构建总结
# ================================
echo ""
echo "======================================"
echo -e "${GREEN}🎉 构建完成！${NC}"
echo ""
echo "📂 构建产物位置:"
echo "   前端: ${OUTPUT_DIR}/frontend/dist/"
echo "   后端: ${OUTPUT_DIR}/backend/dist/"
echo ""
echo "💡 下一步操作:"
echo "   1. 检查构建产物: ls -lh ${OUTPUT_DIR}/*/"
echo "   2. 部署应用: ./deploy.sh"
echo ""

# ================================
# 可选：生成构建报告
# ================================
cat > ${OUTPUT_DIR}/build-report.txt <<EOF
智学 OS 构建报告
================

构建时间: $(date '+%Y-%m-%d %H:%M:%S')
构建主机: $(hostname)

前端构建产物
------------
目录: ${OUTPUT_DIR}/frontend/dist/
大小: $(du -sh ${OUTPUT_DIR}/frontend/dist/ | cut -f1)
文件数: $(find ${OUTPUT_DIR}/frontend/dist/ -type f | wc -l)

后端构建产物
------------
目录: ${OUTPUT_DIR}/backend/dist/
大小: $(du -sh ${OUTPUT_DIR}/backend/dist/ | cut -f1)
文件数: $(find ${OUTPUT_DIR}/backend/dist/ -type f | wc -l)

主要文件清单
------------
$(ls -lh ${OUTPUT_DIR}/frontend/dist/ | head -20)

EOF

echo "📊 构建报告已生成: ${OUTPUT_DIR}/build-report.txt"
echo ""
