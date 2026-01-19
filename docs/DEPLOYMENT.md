# 部署指南

本文档描述如何在云服务器上部署智学 OS（单服务器架构）。

---

## 服务器要求

- **最低配置**: 2核4G内存
- **推荐配置**: 4核8G内存
- **操作系统**: Ubuntu 20.04+ / CentOS 7+
- **必须安装**: Docker, Docker Compose, Git

---

## 快速部署

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 安装 Docker Compose
sudo apt install docker-compose -y

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户加入 docker 组（可选）
sudo usermod -aG docker $USER
# 注销并重新登录生效
```

### 2. 克隆代码

```bash
git clone <your-repo-url>
cd home-learning-os
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env

# 填写以下信息：
# GEMINI_API_KEY=your_actual_gemini_key
# ANYTHINGLLM_API_KEY=$(openssl rand -hex 32)
```

### 4. 执行部署

```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

部署脚本会自动：
- 检查环境配置
- 构建前端代码
- 启动 Docker 容器（Nginx + Backend + AnythingLLM）
- 执行健康检查

### 5. 验证部署

访问以下地址检查服务状态：

- **前端**: http://your-server-ip
- **后端健康检查**: http://your-server-ip/api/health
- **AnythingLLM**: http://your-server-ip:3001

---

## 防火墙配置

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

---

## 常用命令

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f anythingllm
docker-compose logs -f nginx
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 停止服务

```bash
docker-compose down
```

### 更新代码并重新部署

```bash
git pull
./deploy.sh
```

### 查看容器状态

```bash
docker-compose ps
```

### 查看资源使用

```bash
docker stats
```

---

## 性能优化（2核4G 服务器）

### 1. 启用 Swap

```bash
# 创建 2G swap 文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. 定期清理 Docker

```bash
# 清理未使用的镜像、容器、网络
docker system prune -af

# 添加到 crontab（每周执行）
(crontab -l 2>/dev/null; echo "0 2 * * 0 docker system prune -af") | crontab -
```

### 3. 监控内存使用

```bash
# 查看内存使用
free -h

# 查看 Docker 容器资源使用
docker stats --no-stream
```

---

## 配置 HTTPS（可选）

### 使用 Let's Encrypt 免费证书

```bash
# 安装 certbot
sudo apt install certbot

# 生成证书（需要先停止 Nginx）
docker-compose stop nginx
sudo certbot certonly --standalone -d your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# 复制证书到项目目录
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*

# 修改 nginx.conf 启用 HTTPS 配置（取消注释）

# 重启服务
docker-compose up -d
```

---

## 数据备份

### 备份 AnythingLLM 数据

```bash
# 停止服务
docker-compose stop anythingllm

# 备份存储目录
tar -czf anythingllm-backup-$(date +%Y%m%d).tar.gz anythingllm-storage/

# 重启服务
docker-compose start anythingllm
```

### 恢复备份

```bash
# 停止服务
docker-compose stop anythingllm

# 解压备份
tar -xzf anythingllm-backup-YYYYMMDD.tar.gz

# 重启服务
docker-compose start anythingllm
```

---

## 故障排查

### 问题 1: 端口占用

```bash
# 检查端口占用
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :3001

# 停止占用端口的进程
sudo kill -9 <PID>
```

### 问题 2: 容器无法启动

```bash
# 查看详细错误日志
docker-compose logs <service-name>

# 检查配置文件语法
docker-compose config
```

### 问题 3: 内存不足

```bash
# 查看内存使用
free -h

# 查看 Docker 容器内存限制
docker inspect hl-anythingllm | grep -i memory

# 调整 docker-compose.yml 中的内存限制
```

### 问题 4: API Key 配置错误

```bash
# 检查环境变量
docker-compose exec backend env | grep GEMINI
docker-compose exec anythingllm env | grep GEMINI

# 重新设置环境变量后需要重启
docker-compose down
docker-compose up -d
```

---

## 安全建议

1. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **配置防火墙**（仅开放必要端口）

3. **使用 HTTPS**（生产环境必须）

4. **定期备份数据**

5. **监控日志异常**
   ```bash
   docker-compose logs --tail=100 -f | grep -i error
   ```

6. **限制 SSH 访问**（使用密钥认证，禁用密码登录）

---

## 联系与支持

- 项目地址: <your-repo-url>
- 问题反馈: <your-issues-url>
- 设计文档: docs/plans/2026-01-19-图书馆与AI学习园地-design.md
