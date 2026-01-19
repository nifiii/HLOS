# 部署指南

本文档描述如何在 **CentOS 8.2 云服务器**（2核4G, 50GB）上部署智学 OS。

---

## 📋 服务器规格

### 目标配置（已验证）

- **CPU**: 2 核
- **内存**: 4GB
- **硬盘**: 50GB
- **操作系统**: CentOS 8.2
- **网络**: 公网 IP + 80/443 端口开放

### 资源分配规划

| 服务 | CPU | 内存 | 磁盘 | 端口 |
|------|-----|------|------|------|
| Nginx | 0.5核 | 512MB | 1GB | 80/443 |
| Backend | 0.5核 | 1GB | 2GB | 3000 |
| AnythingLLM | 1核 | 2GB | 10GB | 3001 |
| 系统预留 | - | 512MB | 37GB | - |

---

## 🚀 快速部署（一键脚本）

### 前置准备

1. **获取 API Key**:
   - 访问 [Google AI Studio](https://aistudio.google.com/)
   - 申请 Gemini API Key
   - 记录 API Key（后续配置时需要）

2. **SSH 登录服务器**:
   ```bash
   ssh root@your-server-ip
   ```

### 执行部署

```bash
# 1. 安装 Git（如果未安装）
yum install -y git

# 2. 克隆项目
git clone <your-repo-url>
cd home-learning-os

# 3. 执行自动化部署脚本
chmod +x scripts/centos-deploy.sh
./scripts/centos-deploy.sh
```

部署脚本会自动完成：
1. 检测并安装 Docker 和 Docker Compose
2. 配置系统优化参数
3. 引导配置 API Key
4. 构建前端和后端
5. 启动 Docker 容器
6. 执行健康检查

部署完成后，访问 `http://your-server-ip` 即可使用。

---

## 📦 手动部署（详细步骤）

如果需要手动控制部署过程，请按照以下步骤操作。

### 1. 系统初始化

```bash
# 更新系统
yum update -y

# 安装基础工具
yum install -y wget curl git vim net-tools

# 配置时区（可选）
timedatectl set-timezone Asia/Shanghai

# 同步系统时间
yum install -y chrony
systemctl start chronyd
systemctl enable chronyd
```

### 2. 安装 Docker

```bash
# 卸载旧版本 Docker（如果存在）
yum remove -y docker docker-client docker-client-latest docker-common docker-latest

# 安装 Docker 依赖
yum install -y yum-utils device-mapper-persistent-data lvm2

# 添加 Docker 仓库（使用阿里云镜像加速）
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 安装 Docker CE
yum install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证 Docker 安装
docker --version
# 输出: Docker version 24.0.x, build xxx
```

### 3. 安装 Docker Compose

```bash
# 下载 Docker Compose（使用国内镜像）
curl -L "https://get.daocloud.io/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 赋予执行权限
chmod +x /usr/local/bin/docker-compose

# 创建软链接
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# 验证安装
docker-compose --version
# 输出: Docker Compose version v2.23.0
```

### 4. 配置 Docker 镜像加速

```bash
# 创建 Docker 配置目录
mkdir -p /etc/docker

# 配置阿里云镜像加速
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

# 重启 Docker
systemctl daemon-reload
systemctl restart docker
```

### 5. 克隆项目代码

```bash
# 切换到工作目录
cd /opt

# 克隆项目
git clone <your-repo-url> home-learning-os
cd home-learning-os

# 检查分支
git branch -a
git checkout main  # 或其他目标分支
```

### 6. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
vim .env
```

`.env` 文件配置示例：

```bash
# Google Gemini API Key (必需)
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# AnythingLLM API Key (自动生成)
# 生成命令: openssl rand -hex 32
ANYTHINGLLM_API_KEY=a1b2c3d4e5f6789012345678901234567890123456789012345678901234

# 环境模式
NODE_ENV=production
```

**生成 ANYTHINGLLM_API_KEY**:
```bash
openssl rand -hex 32
```

### 7. 执行一键部署

```bash
# 赋予执行权限
chmod +x deploy.sh

# 执行部署脚本
./deploy.sh
```

部署脚本会自动：
1. 检查 `.env` 配置
2. 重组目录结构（首次部署）
3. 安装前端依赖并构建
4. 安装后端依赖
5. 启动 Docker Compose（Nginx + Backend + AnythingLLM）
6. 执行健康检查

### 8. 验证部署

**健康检查**:
```bash
# 检查容器状态
docker-compose ps

# 应该显示 3 个容器都在运行:
# hl-nginx        nginx -g daemon off;        Up      80/tcp, 443/tcp
# hl-backend      node dist/index.js          Up      3000/tcp
# hl-anythingllm  npm start                   Up      3001/tcp
```

**API 健康检查**:
```bash
# 测试后端健康检查接口
curl http://localhost/api/health

# 预期输出:
# {"status":"ok","timestamp":1737123456789,"version":"1.0.0"}
```

**浏览器访问**:
- 前端: http://your-server-ip
- 后端健康检查: http://your-server-ip/api/health
- AnythingLLM 管理界面: http://your-server-ip:3001

---

## 🔧 系统优化（2核4G 专项优化）

### 1. 启用 Swap 交换空间

```bash
# 检查是否已有 Swap
swapon --show

# 创建 2GB Swap 文件
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久生效（写入 /etc/fstab）
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 调整 Swap 使用策略（减少对 Swap 的依赖）
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# 验证
free -h
```

### 2. 优化文件描述符限制

```bash
# 查看当前限制
ulimit -n

# 临时提升限制
ulimit -n 65535

# 永久生效
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65535
* hard nofile 65535
EOF
```

### 3. 调整内核参数

```bash
cat >> /etc/sysctl.conf <<EOF
# 网络优化
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30

# 内存优化
vm.overcommit_memory = 1
vm.max_map_count = 262144
EOF

# 应用配置
sysctl -p
```

### 4. Docker 资源限制调优

项目已在 `docker-compose.yml` 中针对 2核4G 服务器进行优化：

```yaml
# AnythingLLM 内存限制
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G

# 分块策略优化
environment:
  - CHUNK_SIZE=800
  - CHUNK_OVERLAP=150
  - MAX_CONCURRENT_CHUNKS=2
```

**如需进一步调整**，编辑 `docker-compose.yml`:
```bash
vim docker-compose.yml

# 修改 AnythingLLM 内存限制
# limits.memory: 2G → 1.5G （如果内存不足）

# 重启服务
docker-compose down
docker-compose up -d
```

### 5. 定期清理 Docker 资源

```bash
# 手动清理未使用的镜像和容器
docker system prune -af

# 添加定时任务（每周日凌晨2点执行）
(crontab -l 2>/dev/null; echo "0 2 * * 0 docker system prune -af") | crontab -
```

### 6. 日志轮转配置

```bash
# Docker 已在 daemon.json 中配置日志限制:
# "log-opts": {"max-size": "100m", "max-file": "3"}

# 为 Nginx 配置日志轮转
cat > /etc/logrotate.d/nginx-docker <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 3
    daily
    compress
    missingok
    notifempty
    sharedscripts
}
EOF
```

---

## 🔒 防火墙配置

### CentOS 8 使用 firewalld

```bash
# 检查 firewalld 状态
systemctl status firewalld

# 如果未启动，启动 firewalld
systemctl start firewalld
systemctl enable firewalld

# 允许 HTTP/HTTPS
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

# 如果需要暴露 AnythingLLM 管理界面（不推荐生产环境）
# firewall-cmd --permanent --add-port=3001/tcp

# 重载配置
firewall-cmd --reload

# 查看已开放端口
firewall-cmd --list-all
```

### SELinux 配置（可选）

```bash
# 查看 SELinux 状态
getenforce

# 如果遇到权限问题，可临时关闭（不推荐生产环境）
setenforce 0

# 永久关闭 SELinux（需重启）
sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config

# 推荐做法：配置 SELinux 策略而不是关闭
setsebool -P httpd_can_network_connect 1
```

---

## 🌐 配置 HTTPS（Let's Encrypt 免费证书）

### 前提条件

- 已有域名并正确解析到服务器 IP
- 80 端口未被占用

### 步骤 1: 安装 Certbot

```bash
# CentOS 8 安装 Certbot
yum install -y certbot

# 安装 Python 插件
yum install -y python3-certbot-nginx
```

### 步骤 2: 生成证书

```bash
# 停止 Nginx 容器（避免端口冲突）
docker-compose stop nginx

# 使用 Certbot 申请证书
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 按提示输入邮箱（用于续期通知）
# 证书生成路径:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 步骤 3: 复制证书到项目目录

```bash
# 创建 SSL 目录
mkdir -p /opt/home-learning-os/ssl

# 复制证书
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/home-learning-os/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/home-learning-os/ssl/key.pem

# 修改权限
chown -R 1000:1000 /opt/home-learning-os/ssl
```

### 步骤 4: 修改 Nginx 配置

编辑 `nginx.conf`，取消 HTTPS 配置的注释：

```bash
vim nginx.conf
```

取消以下部分的注释（行号 80-91）：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 其他配置与 HTTP server 块相同
}
```

### 步骤 5: 重启服务

```bash
docker-compose up -d
```

### 步骤 6: 配置自动续期

Let's Encrypt 证书有效期 90 天，需配置自动续期：

```bash
# 创建续期脚本
cat > /usr/local/bin/renew-cert.sh <<'EOF'
#!/bin/bash
docker-compose -f /opt/home-learning-os/docker-compose.yml stop nginx
certbot renew --quiet
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/home-learning-os/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/home-learning-os/ssl/key.pem
docker-compose -f /opt/home-learning-os/docker-compose.yml start nginx
EOF

chmod +x /usr/local/bin/renew-cert.sh

# 添加到 crontab（每月1号凌晨3点执行）
(crontab -l 2>/dev/null; echo "0 3 1 * * /usr/local/bin/renew-cert.sh >> /var/log/certbot-renew.log 2>&1") | crontab -
```

---

## 🛠 日常运维

### 查看日志

```bash
# 查看所有服务日志（实时）
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f anythingllm
docker-compose logs -f nginx

# 查看最近 100 行日志
docker-compose logs --tail=100 backend

# 查看错误日志
docker-compose logs | grep -i error
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart anythingllm
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（危险操作）
docker-compose down -v
```

### 更新代码

```bash
cd /opt/home-learning-os

# 拉取最新代码
git pull origin main

# 重新部署
./deploy.sh
```

### 查看资源使用

```bash
# 查看容器状态
docker-compose ps

# 查看资源使用（实时）
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

---

## 💾 数据备份与恢复

### 备份策略

**建议备份频率**:
- AnythingLLM 向量数据: 每周备份
- 用户上传的图书文件: 实时备份（或每日备份）
- 配置文件: 版本控制（Git）

### 备份 AnythingLLM 数据

```bash
# 停止服务（确保数据一致性）
docker-compose stop anythingllm

# 备份存储目录
cd /opt/home-learning-os
tar -czf anythingllm-backup-$(date +%Y%m%d-%H%M%S).tar.gz anythingllm-storage/

# 上传到备份服务器或对象存储（推荐）
# scp anythingllm-backup-*.tar.gz backup-server:/backup/
# 或使用 rclone 上传到云存储

# 重启服务
docker-compose start anythingllm
```

### 恢复备份

```bash
# 停止服务
docker-compose stop anythingllm

# 删除旧数据
rm -rf anythingllm-storage/

# 解压备份
tar -xzf anythingllm-backup-20260119-120000.tar.gz

# 重启服务
docker-compose start anythingllm
```

### 自动化备份脚本

```bash
# 创建备份脚本
cat > /usr/local/bin/backup-anythingllm.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backup/anythingllm"
PROJECT_DIR="/opt/home-learning-os"
DATE=$(date +%Y%m%d-%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 停止服务
cd $PROJECT_DIR
docker-compose stop anythingllm

# 备份
tar -czf $BACKUP_DIR/anythingllm-backup-$DATE.tar.gz anythingllm-storage/

# 重启服务
docker-compose start anythingllm

# 删除 7 天前的备份
find $BACKUP_DIR -name "anythingllm-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/anythingllm-backup-$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-anythingllm.sh

# 添加到 crontab（每周日凌晨 4 点备份）
(crontab -l 2>/dev/null; echo "0 4 * * 0 /usr/local/bin/backup-anythingllm.sh >> /var/log/backup.log 2>&1") | crontab -
```

---

## 🐛 故障排查

### 问题 1: 容器启动失败

**症状**: `docker-compose up -d` 后容器未运行

**排查步骤**:
```bash
# 查看容器状态
docker-compose ps

# 查看详细日志
docker-compose logs <service-name>

# 检查配置文件语法
docker-compose config
```

**常见原因**:
- 端口被占用（80, 443, 3000, 3001）
- 环境变量未配置（GEMINI_API_KEY）
- 磁盘空间不足

### 问题 2: 后端健康检查失败

**症状**: `curl http://localhost/api/health` 返回 502 Bad Gateway

**排查步骤**:
```bash
# 检查 backend 容器是否运行
docker-compose ps backend

# 查看 backend 日志
docker-compose logs backend

# 检查环境变量
docker-compose exec backend env | grep GEMINI_API_KEY
```

**解决方案**:
```bash
# 重启 backend 服务
docker-compose restart backend

# 如果环境变量未配置，检查 .env 文件
vim .env

# 重新部署
docker-compose down
docker-compose up -d
```

### 问题 3: AnythingLLM 内存溢出

**症状**: `docker stats` 显示 AnythingLLM 内存使用接近 2GB，容器频繁重启

**解决方案**:
```bash
# 调整内存限制（编辑 docker-compose.yml）
vim docker-compose.yml

# 修改 AnythingLLM 内存限制:
# limits.memory: 2G → 2.5G

# 或减少并发分块数:
# MAX_CONCURRENT_CHUNKS: 2 → 1

# 重启服务
docker-compose down
docker-compose up -d
```

### 问题 4: 图像识别超时

**症状**: 拍题模块识别超时，提示 "网络层解构失败"

**排查步骤**:
```bash
# 测试 Gemini API 连通性
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=YOUR_API_KEY"
```

**解决方案**:
- 检查服务器是否能访问 Google API（部分地区可能受限）
- 使用代理服务器或 API 中继服务
- 调整 Nginx 超时时间（`nginx.conf` 中 `proxy_read_timeout`）

### 问题 5: 磁盘空间不足

**症状**: `df -h` 显示根分区使用率超过 90%

**解决方案**:
```bash
# 清理 Docker 资源
docker system prune -af

# 清理日志文件
journalctl --vacuum-time=7d

# 检查大文件
du -sh /* | sort -rh | head -10

# 清理 AnythingLLM 旧向量数据（如果不再需要）
# 谨慎操作，建议先备份
```

### 问题 6: CentOS 8 YUM 仓库失效

**症状**: `yum install` 提示 "Failed to download metadata"

**解决方案**:
```bash
# CentOS 8 已停止维护，需切换到 CentOS Stream 或 Rocky Linux 镜像源

# 备份原仓库配置
mkdir -p /etc/yum.repos.d/backup
mv /etc/yum.repos.d/*.repo /etc/yum.repos.d/backup/

# 使用阿里云 CentOS-Vault 镜像
curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-vault-8.5.2111.repo

# 清理缓存并更新
yum clean all
yum makecache
```

---

## 📊 性能监控

### 安装监控工具（可选）

```bash
# 安装 htop（更友好的 top）
yum install -y htop

# 安装 iotop（磁盘 I/O 监控）
yum install -y iotop

# 安装 iftop（网络流量监控）
yum install -y iftop
```

### 监控关键指标

```bash
# CPU 和内存使用
htop

# Docker 容器资源使用
docker stats --no-stream

# 磁盘 I/O
iotop -o

# 网络流量
iftop -i eth0
```

### 配置 Prometheus + Grafana（高级）

如果需要专业的监控方案，可参考 `docs/monitoring-setup.md`（待补充）。

---

## 🔄 版本升级

### 升级流程

```bash
# 1. 备份数据
/usr/local/bin/backup-anythingllm.sh

# 2. 拉取最新代码
cd /opt/home-learning-os
git fetch origin
git log HEAD..origin/main  # 查看更新内容
git pull origin main

# 3. 检查变更
git diff HEAD@{1} docker-compose.yml
git diff HEAD@{1} .env.example

# 4. 更新环境变量（如有新增）
vim .env

# 5. 重新部署
./deploy.sh

# 6. 验证升级
docker-compose ps
curl http://localhost/api/health
```

### 回滚版本

```bash
# 查看历史提交
git log --oneline -10

# 回滚到指定版本
git reset --hard <commit-hash>

# 重新部署
./deploy.sh
```

---

## 📞 技术支持

### 日志收集（用于问题反馈）

```bash
# 生成诊断报告
cat > /tmp/diagnosis.sh <<'EOF'
#!/bin/bash
echo "=== System Info ==="
uname -a
free -h
df -h

echo -e "\n=== Docker Info ==="
docker --version
docker-compose --version

echo -e "\n=== Container Status ==="
docker-compose ps

echo -e "\n=== Recent Logs ==="
docker-compose logs --tail=50
EOF

chmod +x /tmp/diagnosis.sh
bash /tmp/diagnosis.sh > /tmp/diagnosis.log 2>&1

# 下载诊断报告
# scp root@your-server:/tmp/diagnosis.log ./
```

### 联系方式

- **项目地址**: <your-repo-url>
- **问题反馈**: <your-issues-url>
- **技术文档**: docs/plans/

---

## 📚 扩展阅读

- [Docker 官方文档](https://docs.docker.com/)
- [AnythingLLM 官方文档](https://docs.anythingllm.com/)
- [Gemini API 文档](https://ai.google.dev/docs)
- [CentOS 8 迁移指南](https://www.centos.org/centos-stream/)

---

**祝部署顺利！如有问题，请提交 Issue。**
