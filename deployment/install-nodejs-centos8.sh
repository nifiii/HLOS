#!/bin/bash

set -e

echo "📦 CentOS 8 - 安装 Node.js 20"
echo "=============================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查权限
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 请使用 root 权限运行${NC}"
    echo "   sudo bash install-nodejs-centos8.sh"
    exit 1
fi

# 卸载旧版本
echo "🗑️  卸载旧版本 Node.js..."
yum remove -y nodejs npm 2>/dev/null || true

# CentOS 8 已 EOL，切换到 vault 镜像
echo "🔧 配置 CentOS 8 Vault 镜像..."
sed -i 's|^mirrorlist=|#mirrorlist=|g' /etc/yum.repos.d/CentOS-*
sed -i 's|^#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*

# 清理缓存
yum clean all
yum makecache

# 安装 NodeSource 仓库
echo "📥 添加 NodeSource 仓库（Node.js 20）..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -

# 安装 Node.js
echo "📦 安装 Node.js 20..."
yum install -y nodejs

# 验证安装
echo ""
echo "✅ 验证安装结果..."
node -v
npm -v

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✅ Node.js 安装成功！版本: $(node -v)${NC}"
else
    echo -e "${RED}❌ Node.js 版本仍然过低${NC}"
    exit 1
fi

echo ""
echo "🎉 安装完成！现在可以运行部署脚本："
echo "   ./deploy-hybrid.sh"
