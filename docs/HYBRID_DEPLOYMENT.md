# 混合部署方案文档

## 架构对比

| 组件 | 全 Docker 方案 | 混合部署方案 | 理由 |
|------|--------------|------------|------|
| **前端** | Nginx 容器 | 系统 Nginx | 静态文件无需容器隔离 |
| **后端** | Node 容器 | systemd 服务 | 减少容器开销，原生性能 |
| **AnythingLLM** | 容器 | 容器 | 第三方服务，隔离更安全 |

## 资源消耗对比（2核4G 服务器）

```
全 Docker 方案:
├── Nginx 容器:      50MB
├── Node 容器:       250MB + 容器层开销 100MB
├── AnythingLLM:     800MB
└── Docker Daemon:   150MB
    总计:            ~1.35GB

混合部署方案:
├── 系统 Nginx:      10MB
├── Node 进程:       200MB
├── AnythingLLM:     800MB
└── Docker Daemon:   50MB (仅一个容器)
    总计:            ~1.06GB

节省: ~300MB 内存 + ~15% CPU
```

## 部署步骤

### 前置准备（在目标服务器）

```bash
# 1. 安装 Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# 2. 安装 Nginx
yum install -y nginx
systemctl enable nginx
systemctl start nginx

# 3. 安装 Docker & Docker Compose
curl -fsSL https://get.docker.com | bash
systemctl enable docker
systemctl start docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. 配置防火墙
firewall-cmd --add-service=http --permanent
firewall-cmd --add-service=https --permanent
firewall-cmd --reload
```

### 执行部署

```bash
# 1. 上传代码到服务器
scp -r HL-os/ root@your-server:/root/

# 2. 进入项目目录
cd /root/HL-os

# 3. 配置环境变量
cp .env.example .env
vim .env  # 填写 GEMINI_API_KEY 等

# 4. 执行混合部署
chmod +x deploy-hybrid.sh
sudo ./deploy-hybrid.sh
```

## 运维命令

### 日常管理

```bash
# 查看后端日志（实时）
journalctl -u hl-backend -f

# 查看后端日志（最近 100 行）
journalctl -u hl-backend -n 100 --no-pager

# 重启后端
systemctl restart hl-backend

# 查看后端状态
systemctl status hl-backend

# 重载 Nginx 配置
nginx -t && systemctl reload nginx

# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log

# 管理 AnythingLLM
docker-compose -f docker-compose.anythingllm.yml logs -f
docker-compose -f docker-compose.anythingllm.yml restart
```

### 更新应用

```bash
# 1. 拉取最新代码
cd /root/HL-os
git pull

# 2. 重新编译
./build.sh

# 3. 重新部署
sudo ./deploy-hybrid.sh
```

### 监控与调试

```bash
# 查看进程资源占用
ps aux | grep -E 'node|nginx|docker'

# 实时监控资源
htop

# 查看端口监听
ss -tlnp | grep -E '80|443|3000|3001'

# 测试后端健康
curl http://127.0.0.1:3000/health

# 测试 Nginx 代理
curl http://127.0.0.1/api/health
```

## 故障排查

### 后端无法启动

```bash
# 查看详细日志
journalctl -u hl-backend -xe

# 常见原因：
# 1. 端口被占用
ss -tlnp | grep 3000

# 2. 环境变量缺失
cat /opt/hl-os/.env

# 3. 依赖缺失
cd /opt/hl-os/backend && npm install --omit=dev

# 4. 权限问题
ls -la /opt/hl-os/backend/
```

### Nginx 502 错误

```bash
# 1. 确认后端运行
systemctl status hl-backend
curl http://127.0.0.1:3000/health

# 2. 检查 Nginx 配置
nginx -t
cat /etc/nginx/conf.d/hl-os.conf

# 3. 查看 Nginx 错误日志
tail -n 50 /var/log/nginx/error.log

# 4. SELinux 问题（CentOS/RHEL）
setsebool -P httpd_can_network_connect 1
```

### AnythingLLM 无法访问

```bash
# 查看容器状态
docker ps -a | grep anythingllm

# 查看容器日志
docker logs hl-anythingllm --tail 100

# 重启容器
docker-compose -f docker-compose.anythingllm.yml restart

# 检查端口
ss -tlnp | grep 3001
```

## 性能优化

### Nginx 缓存

```nginx
# 在 /etc/nginx/conf.d/hl-os-locations.conf 添加

# 静态资源更激进的缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# API 响应缓存（谨慎使用）
proxy_cache_path /var/cache/nginx/hl-api levels=1:2 keys_zone=hl_api_cache:10m max_size=100m inactive=60m;

location /api/books {
    proxy_cache hl_api_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    proxy_pass http://hl_backend;
}
```

### 后端 PM2 管理（可选替代 systemd）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd /opt/hl-os/backend
pm2 start dist/index.js --name hl-backend \
  --max-memory-restart 512M \
  --log /opt/hl-os/logs/backend.log

# 开机自启
pm2 startup
pm2 save

# 管理命令
pm2 status
pm2 logs hl-backend
pm2 restart hl-backend
pm2 monit
```

## 回滚到全 Docker 方案

如遇问题需回滚：

```bash
# 停止宿主机服务
systemctl stop hl-backend
systemctl disable hl-backend

# 恢复 docker-compose.yml
git checkout docker-compose.yml

# 启动完整 Docker 栈
docker-compose up -d --build
```

## 安全加固

### 1. Nginx HTTPS 配置

```bash
# 使用 Let's Encrypt
yum install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com

# 自动续期
crontab -e
# 添加: 0 3 * * * certbot renew --quiet
```

### 2. 防火墙规则

```bash
# 仅开放必要端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# 禁止直接访问后端
firewall-cmd --permanent --remove-port=3000/tcp
```

### 3. 限制后端访问

在 `hl-backend.service` 中添加：

```ini
[Service]
# 仅监听本地回环
Environment="HOST=127.0.0.1"

# 禁止后端访问外网（可选）
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
```
