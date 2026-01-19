# 混合部署 - 快速启动指南

## 一键部署（推荐）

```bash
# 1. 配置环境变量
cp .env.example .env && vim .env

# 2. 执行混合部署
sudo ./deploy-hybrid.sh
```

## 服务管理速查

```bash
# 后端
systemctl {start|stop|restart|status} hl-backend
journalctl -u hl-backend -f

# Nginx
systemctl {reload|restart|status} nginx
nginx -t

# AnythingLLM
docker-compose -f docker-compose.anythingllm.yml {up|down|logs|restart}
```

## 目录结构

```
/opt/hl-os/
├── frontend/              # 前端静态文件（Nginx root）
├── backend/
│   ├── dist/             # 编译后的后端代码
│   ├── node_modules/     # 生产依赖
│   └── package.json
├── logs/                 # 应用日志
├── anythingllm-storage/  # AnythingLLM 数据
├── anythingllm-hotdir/
└── .env                  # 环境变量

/etc/nginx/conf.d/
├── hl-os.conf           # 主配置（server 块）
└── hl-os-locations.conf # Location 规则

/etc/systemd/system/
└── hl-backend.service   # 后端 systemd 服务
```

## 健康检查 URL

```bash
# 前端
curl http://localhost/

# 后端
curl http://localhost/api/health

# Nginx
curl http://localhost/health

# AnythingLLM
curl http://localhost:3001
```

## 资源监控

```bash
# 内存占用
ps aux | awk '/node|nginx/ {sum+=$6} END {print sum/1024" MB"}'

# CPU 使用
top -bn1 | grep "Cpu(s)"

# 磁盘占用
du -sh /opt/hl-os/*
```

## 常见问题

### Q: 502 Bad Gateway
```bash
# 检查后端是否运行
systemctl status hl-backend

# 查看后端日志
journalctl -u hl-backend -n 50
```

### Q: 修改 Nginx 配置后如何生效？
```bash
nginx -t && systemctl reload nginx
```

### Q: 如何更新应用？
```bash
cd /root/HL-os
git pull
./build.sh
sudo ./deploy-hybrid.sh
```

### Q: 如何卸载？
```bash
# 停止服务
systemctl stop hl-backend
systemctl disable hl-backend
docker-compose -f docker-compose.anythingllm.yml down

# 删除文件
rm -rf /opt/hl-os
rm /etc/systemd/system/hl-backend.service
rm /etc/nginx/conf.d/hl-os*.conf

systemctl daemon-reload
systemctl reload nginx
```
