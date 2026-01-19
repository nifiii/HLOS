#!/bin/bash

set -e

echo "🚀 智学 OS - 混合部署脚本（宿主机 + Docker）"
echo "=============================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置变量
INSTALL_DIR="/opt/hl-os"
NGINX_CONF_DIR="/etc/nginx/conf.d"
SYSTEMD_DIR="/etc/systemd/system"
BUILD_DIR="./build-output"

# ================================
# 1. 检查权限
# ================================
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 请使用 root 权限运行此脚本${NC}"
    echo "   sudo ./deploy-hybrid.sh"
    exit 1
fi

# ================================
# 2. 环境检查
# ================================
echo "🔍 检查部署环境..."

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${RED}❌ 未找到 .env 文件${NC}"
    echo "提示: cp .env.example .env && vim .env"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "安装命令: curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && yum install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 版本过低 (需要 >= 18)${NC}"
    exit 1
fi

# 检查 Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ Nginx 未安装${NC}"
    echo "安装命令: yum install -y nginx"
    exit 1
fi

# 检查 Docker（仅用于 AnythingLLM）
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "安装命令: curl -fsSL https://get.docker.com | bash"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境检查通过${NC}"
echo ""

# ================================
# 3. 执行容器化编译
# ================================
echo "🏗️  开始容器化编译..."

if [ -f "build.sh" ]; then
    chmod +x build.sh
    ./build.sh || {
        echo -e "${RED}❌ 编译失败${NC}"
        exit 1
    }
else
    echo -e "${RED}❌ 未找到 build.sh${NC}"
    exit 1
fi

if [ ! -d "$BUILD_DIR/frontend/dist" ] || [ ! -d "$BUILD_DIR/backend/dist" ]; then
    echo -e "${RED}❌ 编译产物缺失${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 编译完成${NC}"
echo ""

# ================================
# 4. 部署文件到目标目录
# ================================
echo "📦 部署应用文件到 $INSTALL_DIR..."

# 创建目录结构
mkdir -p $INSTALL_DIR/{frontend,backend,logs}
mkdir -p $INSTALL_DIR/{anythingllm-storage,anythingllm-hotdir}

# 复制前端
echo "   → 复制前端文件..."
rm -rf $INSTALL_DIR/frontend/*
cp -r $BUILD_DIR/frontend/dist/* $INSTALL_DIR/frontend/

# 复制后端
echo "   → 复制后端文件..."
rm -rf $INSTALL_DIR/backend/dist
cp -r $BUILD_DIR/backend/dist $INSTALL_DIR/backend/

# 复制后端依赖（生产环境）
echo "   → 安装后端依赖..."
cp backend/package*.json $INSTALL_DIR/backend/
cd $INSTALL_DIR/backend
npm install --omit=dev --production 2>/dev/null || npm install --omit=dev
cd - > /dev/null

# 复制环境变量
cp .env $INSTALL_DIR/.env
chmod 600 $INSTALL_DIR/.env

# 设置权限
chown -R nobody:nobody $INSTALL_DIR
chmod -R 755 $INSTALL_DIR/frontend
chmod -R 755 $INSTALL_DIR/backend

echo -e "${GREEN}✅ 应用文件部署完成${NC}"
echo ""

# ================================
# 5. 配置 Systemd Service
# ================================
echo "⚙️  配置 Systemd Service..."

cp deployment/hl-backend.service $SYSTEMD_DIR/
systemctl daemon-reload
systemctl enable hl-backend.service
systemctl restart hl-backend.service

# 等待后端启动
sleep 3

if systemctl is-active --quiet hl-backend.service; then
    echo -e "${GREEN}✅ 后端服务启动成功${NC}"
else
    echo -e "${RED}❌ 后端服务启动失败${NC}"
    echo "查看日志: journalctl -u hl-backend -n 50 --no-pager"
    journalctl -u hl-backend -n 20 --no-pager
    exit 1
fi

echo ""

# ================================
# 6. 配置 Nginx
# ================================
echo "🌐 配置 Nginx..."

# 备份旧配置
if [ -f "$NGINX_CONF_DIR/home.conf" ]; then
    cp $NGINX_CONF_DIR/home.conf $NGINX_CONF_DIR/home.conf.bak.$(date +%s)
    echo "   已备份旧配置"
fi

# 复制新配置
cp deployment/home.conf $NGINX_CONF_DIR/home.conf

# 测试配置
nginx -t || {
    echo -e "${RED}❌ Nginx 配置测试失败${NC}"
    echo "查看配置: cat $NGINX_CONF_DIR/home.conf"
    exit 1
}

# 重载 Nginx
systemctl reload nginx

echo -e "${GREEN}✅ Nginx 配置完成${NC}"
echo "   配置文件: $NGINX_CONF_DIR/home.conf"
echo "   域名: home.haokuai.uk"
echo ""

# ================================
# 7. 启动 AnythingLLM (Docker)
# ================================
echo "🐳 启动 AnythingLLM 容器..."

# 停止旧容器
docker-compose -f docker-compose.anythingllm.yml down 2>/dev/null || true

# 启动新容器
docker-compose -f docker-compose.anythingllm.yml up -d

echo -e "${GREEN}✅ AnythingLLM 容器启动完成${NC}"
echo ""

# ================================
# 8. 健康检查
# ================================
echo "🏥 执行健康检查..."
echo "--------------------------------"

sleep 5

# 检查后端（直接访问后端端口）
if curl -f http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端健康检查通过 (直连)${NC}"
else
    echo -e "${RED}❌ 后端健康检查失败${NC}"
    echo "查看日志: journalctl -u hl-backend -n 50"
fi

# 检查 Nginx（通过 Nginx 代理访问后端）
if curl -f http://127.0.0.1/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx 代理检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx 代理检查失败（可能需配置 DNS）${NC}"
    echo "   本地测试: curl http://127.0.0.1/api/health"
fi

# 检查 Nginx 自身健康检查端点
if curl -f http://127.0.0.1/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx 健康端点通过${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx 健康端点未响应${NC}"
fi

# 检查 AnythingLLM
sleep 10
if curl -f http://127.0.0.1:3001 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ AnythingLLM 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  AnythingLLM 仍在启动中${NC}"
fi

# ================================
# 9. 部署总结
# ================================
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 混合部署完成！${NC}"
echo "=============================================="
echo ""
echo "📍 服务状态:"
echo "   前端:          $INSTALL_DIR/frontend/ (Nginx 静态服务)"
echo "   后端:          systemd (hl-backend.service)"
echo "   AnythingLLM:   Docker 容器"
echo ""
echo "📍 访问地址:"
echo "   前端:          http://home.haokuai.uk"
echo "   后端 API:      http://home.haokuai.uk/api/"
echo "   健康检查:      http://home.haokuai.uk/health"
echo "   本地测试:      http://$(hostname -I | awk '{print $1}')"
echo ""
echo "📊 管理命令:"
echo "   后端日志:      journalctl -u hl-backend -f"
echo "   后端重启:      systemctl restart hl-backend"
echo "   后端状态:      systemctl status hl-backend"
echo "   Nginx 重载:    systemctl reload nginx"
echo "   Nginx 日志:    tail -f /var/log/nginx/error.log"
echo "   AnythingLLM:   docker-compose -f docker-compose.anythingllm.yml logs -f"
echo ""
echo "💾 资源占用估算:"
echo "   后端 (Node.js):     ~200MB"
echo "   AnythingLLM (容器): ~800MB"
echo "   Nginx:              ~10MB"
echo "   总计:               ~1GB (节省约 500MB)"
echo ""
echo "⚠️  重要提示:"
echo "   1. 修改 Nginx 配置中的 server_name (your-domain.com)"
echo "   2. 如需 HTTPS，取消注释 /etc/nginx/conf.d/hl-os.conf 的 SSL 配置"
echo "   3. 防火墙开放端口: firewall-cmd --add-service=http --permanent && firewall-cmd --reload"
echo ""
