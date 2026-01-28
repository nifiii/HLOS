#!/bin/bash

set -e

echo "🚀 智学 OS - 生产环境一键部署脚本"
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
# 0. 检查权限
# ================================
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 请使用 root 权限运行此脚本${NC}"
    echo "   sudo ./deploy.sh"
    exit 1
fi

# ================================
# 1. 安装系统依赖 (可选)
# ================================
INSTALL_DEPS=false
if [[ "$1" == "--with-deps" ]]; then
    INSTALL_DEPS=true
fi

if [ "$INSTALL_DEPS" = true ]; then
    echo "📦 安装系统依赖..."

    # 检测操作系统
    if [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        echo "   检测到 CentOS/RHEL 系统"

        # CentOS 8 EOL 处理
        if grep -q "release 8" /etc/redhat-release; then
            echo "   🔧 配置 CentOS 8 Vault 镜像..."
            sed -i 's|^mirrorlist=|#mirrorlist=|g' /etc/yum.repos.d/CentOS-*
            sed -i 's|^#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*
            yum clean all
            yum makecache
        fi

        # 安装 Node.js 20
        if ! command -v node &> /dev/null; then
            echo "   📥 安装 Node.js 20..."
            yum remove -y nodejs npm 2>/dev/null || true
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y nodejs
        fi

        # 安装 Nginx
        if ! command -v nginx &> /dev/null; then
            echo "   📥 安装 Nginx..."
            yum install -y nginx
        fi

    elif [ -f /etc/debian_version ]; then
        # Ubuntu/Debian
        echo "   检测到 Ubuntu/Debian 系统"

        apt-get update

        # 安装 Node.js 20
        if ! command -v node &> /dev/null; then
            echo "   📥 安装 Node.js 20..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        fi

        # 安装 Nginx
        if ! command -v nginx &> /dev/null; then
            echo "   📥 安装 Nginx..."
            apt-get install -y nginx
        fi
    else
        echo -e "${RED}❌ 不支持的操作系统${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ 系统依赖安装完成${NC}"
    echo ""
else
    echo "💡 跳过依赖安装 (如需安装: ./deploy.sh --with-deps)"
    echo ""
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
    echo "安装命令: ./deploy.sh --with-deps"
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
    echo "安装命令: ./deploy.sh --with-deps"
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
mkdir -p $INSTALL_DIR/{frontend,backend,logs,data,uploads}
mkdir -p $INSTALL_DIR/data/{obsidian,originals/{images,books}}

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

# 启用新版编译器以支持 better-sqlite3 (针对 CentOS 8)
if [ -f "/opt/rh/gcc-toolset-11/enable" ]; then
  source /opt/rh/gcc-toolset-11/enable
  echo "✓ 已启用 gcc-toolset-11"
fi

# 增加 --legacy-peer-deps 以避免版本冲突
npm install --omit=dev --production --legacy-peer-deps 2>/dev/null || npm install --omit=dev --legacy-peer-deps
cd - > /dev/null

# 复制环境变量（从 /opt/.env 获取权威配置）
echo "   → 从 /opt/.env 获取配置..."
if [ -f "/opt/.env" ]; then
  cp /opt/.env $INSTALL_DIR/.env
  echo "✓ 从 /opt/.env 复制成功"
else
  echo "❌ 警告：/opt/.env 不存在，请先配置！"
  exit 1
fi
chmod 600 $INSTALL_DIR/.env

# 设置权限
chown -R nobody:nobody $INSTALL_DIR
chmod -R 755 $INSTALL_DIR/frontend
chmod -R 755 $INSTALL_DIR/backend
chmod -R 777 $INSTALL_DIR/data
chmod -R 777 $INSTALL_DIR/uploads

echo -e "${GREEN}✅ 应用文件部署完成${NC}"
echo ""

# ================================
# 5. 配置 Systemd Service
# ================================
echo "⚙️  配置 Systemd Service..."

cat > $SYSTEMD_DIR/hl-backend.service <<EOF
[Unit]
Description=HL-OS Backend Service
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=$INSTALL_DIR/backend
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/backend/dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

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
if [ -f "$NGINX_CONF_DIR/hl-os.conf" ]; then
    cp $NGINX_CONF_DIR/hl-os.conf $NGINX_CONF_DIR/hl-os.conf.bak.$(date +%s)
    echo "   已备份旧配置"
fi

# 生成 Nginx 配置
cat > $NGINX_CONF_DIR/hl-os.conf <<'EOF'
server {
    listen 80;
    server_name _;  # 修改为你的域名

    # 前端静态文件
    location / {
        root /opt/hl-os/frontend;
        try_files $uri $uri/ /index.html;
        index index.html;

        # 禁用静态文件缓存，确保更新立即生效
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # JS/CSS 文件使用内容哈希，可以长期缓存
    location ~* \.(js|css)$ {
        root /opt/hl-os/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # 大文件上传
        client_max_body_size 1024M;
        proxy_request_buffering off;
    }

    # 数据目录 - 封面图片
    location /covers/ {
        alias /opt/hl-os/data/obsidian/covers/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 数据目录 - 统一访问
    location /data/ {
        alias /opt/hl-os/data/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 临时上传目录 (用于预览)
    location /uploads/ {
        alias /opt/hl-os/uploads/;
        expires 1h;
    }

    # 健康检查端点
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# 测试配置
nginx -t || {
    echo -e "${RED}❌ Nginx 配置测试失败${NC}"
    echo "查看配置: cat $NGINX_CONF_DIR/hl-os.conf"
    exit 1
}

# 重载 Nginx
systemctl reload nginx

echo -e "${GREEN}✅ Nginx 配置完成${NC}"
echo "   配置文件: $NGINX_CONF_DIR/hl-os.conf"
echo "   ⚠️  请修改 server_name 为你的域名"
echo ""

# ================================
# 7. 健康检查
# ================================
echo "🏥 执行健康检查..."
echo "--------------------------------"

sleep 3

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

# 检查 Nginx 健康端点
if curl -f http://127.0.0.1/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx 健康端点通过${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx 健康端点未响应${NC}"
fi

# ================================
# 8. 部署总结
# ================================
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 生产环境部署完成！${NC}"
echo "=============================================="
echo ""
echo "📍 服务状态:"
echo "   前端:          $INSTALL_DIR/frontend/ (Nginx 静态服务)"
echo "   后端:          systemd (hl-backend.service)"
echo ""
echo "📍 访问地址:"
echo "   本地测试:      http://127.0.0.1"
echo "   外网访问:      http://your-domain.com (需配置域名)"
echo "   健康检查:      http://your-domain.com/health"
echo ""
echo "📊 管理命令:"
echo "   后端日志:      journalctl -u hl-backend -f"
echo "   后端重启:      systemctl restart hl-backend"
echo "   后端状态:      systemctl status hl-backend"
echo "   Nginx 重载:    systemctl reload nginx"
echo "   Nginx 日志:    tail -f /var/log/nginx/error.log"
echo ""
echo "💾 资源占用:"
echo "   后端 (Node.js): ~200MB"
echo "   Nginx:          ~10MB"
echo "   总计:           ~210MB"
echo ""
echo "⚠️  重要提示:"
echo "   1. 修改 /etc/nginx/conf.d/hl-os.conf 中的 server_name"
echo "   2. 配置防火墙: firewall-cmd --add-service=http --permanent && firewall-cmd --reload"
echo "   3. 如需HTTPS，参考: docs/SECURITY.md"
echo ""
