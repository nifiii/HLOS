# 服务端数据持久化 - 测试与部署指南

**日期**: 2026-01-20
**最后更新**: 2026-01-21
**状态**: 已完成，包含分片上传功能

---

## 1. 功能概述

已完成前端到服务端的数据持久化迁移：
- ✅ 扫描项（错题/笔记）保存到服务器文件系统
- ✅ 教材文件保存到服务器文件系统
- ✅ Obsidian 格式 Markdown 自动生成
- ✅ AnythingLLM 向量数据库自动索引
- ✅ 前端从服务器加载数据（移除 IndexedDB）
- ✅ **分片上传**：支持大文件上传（5MB分片），带进度显示和重试机制
- ✅ **多图片上传**：支持多页试卷，串行OCR处理
- ✅ **临时文件清理**：自动清理24小时前的过期分片文件

---

## 2. 后端部署步骤

### 2.1 环境准备

确保服务器已安装：
- Docker & Docker Compose
- Node.js 20.x
- 2C4G 服务器配置

### 2.2 创建数据目录

```bash
# SSH 登录服务器
ssh user@your-server

# 创建数据目录
sudo mkdir -p /opt/hl-os/data
sudo chown -R www-data:www-data /opt/hl-os

# 子目录会自动创建：
# /opt/hl-os/data/obsidian/
# /opt/hl-os/data/originals/
# /opt/hl-os/data/metadata.json
```

### 2.3 更新 Docker Compose 配置

确保 `docker-compose.yml` 包含数据卷挂载：

```yaml
backend:
  volumes:
    - ./data:/opt/hl-os/data  # 数据持久化
    - ./uploads:/app/uploads  # 分片上传目录 ⭐NEW
  environment:
    - DATA_DIR=/opt/hl-os/data
    - UPLOAD_DIR=/app/uploads  # 分片上传目录 ⭐NEW
```

### 2.4 拉取最新代码

```bash
cd /opt/hl-os
git pull origin master
```

### 2.5 重新构建并启动

```bash
# 停止现有服务
docker-compose down

# 重新构建后端
cd backend
npm install
npm run build

# 启动所有服务
cd ..
docker-compose up -d

# 查看日志
docker-compose logs -f backend
```

### 2.6 验证后端服务

```bash
# 健康检查
curl http://localhost:3000/api/health

# 预期响应：
# {"status":"ok","timestamp":1737360000000,"version":"1.0.0"}
```

---

## 3. 前端部署步骤

### 3.1 构建前端

```bash
cd /opt/hl-os
npm install
npm run build
```

### 3.2 更新 Nginx 配置

无需额外配置，前端会自动调用 `/api/*` 端点。

---

## 4. 功能测试清单

### 4.1 扫描项保存测试

**测试步骤**：
1. 打开浏览器，访问 `http://your-server/`
2. 选择用户"大宝"
3. 进入"拍题录入"模块
4. 上传一张错题图片
5. 点击"分析"按钮
6. 等待 AI 分析完成
7. 点击"保存到知识库"

**验证点**：
- ✅ 保存按钮显示"保存中..."加载状态
- ✅ 保存成功后触发庆祝动画
- ✅ 界面自动重置
- ✅ 无错误提示

**服务端验证**：
```bash
# 检查文件是否创建
ls -lh /opt/hl-os/data/originals/images/$(date +%Y-%m)/
ls -lh /opt/hl-os/data/obsidian/Wrong_Problems/大宝/数学/

# 检查元数据索引
cat /opt/hl-os/data/metadata.json | jq '.[] | select(.type=="wrong_problem")' | head -20
```

**预期结果**：
- 原始图片保存在 `/opt/hl-os/data/originals/images/YYYY-MM/DD_HHMMSS_uuid.jpg`
- Markdown 文件保存在 `/opt/hl-os/data/obsidian/Wrong_Problems/大宝/数学/YYYY-MM-DD_主题_uuid.md`
- `metadata.json` 包含该扫描项的元数据

### 4.2 教材上传测试（含分片上传）

**测试步骤**：
1. 进入"图书馆"模块
2. 点击"上传教材"
3. 选择一个较大的 PDF 文件（10-50MB，测试分片功能）
4. 点击"开始上传"

**验证点**：
- ✅ **分片上传进度条**：显示当前分片（第X/共Y片）
- ✅ **字节进度**：已上传/总字节数显示
- ✅ **AI 元数据分析成功**
- ✅ **元数据编辑界面显示**
- ✅ **保存后图书出现在列表中**

**服务端验证**：
```bash
# 检查文件是否创建
ls -lh /opt/hl-os/data/uploads/files/

# 检查临时分片目录是否已清理（上传1小时后）
ls -lh /opt/hl-os/data/uploads/temp/ || echo "临时目录已清理（预期行为）"

# 检查元数据
cat /opt/hl-os/data/metadata.json | jq '.[] | select(.type=="textbook")'
```

**分片上传功能特性**：
- **自动分片**：文件 > 5MB 自动分片上传
- **进度显示**：实时显示分片索引和总字节数
- **智能重试**：上传失败自动重试（1s, 2s, 3s）
- **自动合并**：所有分片上传完成后自动合并
- **临时清理**：24小时后自动清理过期分片文件

**服务端验证**：
```bash
# 检查文件是否创建
ls -lh /opt/hl-os/data/originals/books/$(date +%Y-%m)/

# 检查元数据
cat /opt/hl-os/data/metadata.json | jq '.[] | select(.type=="textbook")'
```

### 4.3 多图片上传测试（多页试卷）

**测试步骤**：
1. 进入"拍题录入"模块
2. 点击上传区域，选择多张图片（Shift/Ctrl 多选）
3. 点击"开始分析"

**验证点**：
- ✅ **多图选择**：可以一次选择多张图片
- ✅ **串行处理提示**：显示"正在识别第 X / Y 张"
- ✅ **逐张完成动画**：每张图片处理完成后触发庆祝动画
- ✅ **自动关联**：多张图片通过 `parentExamId` 关联
- ✅ **页码编号**：`pageNumber` 从1开始，`totalPages` 显示总页数

**服务端验证**：
```bash
# 检查同一试卷的所有页码
cat /opt/hl-os/data/metadata.json | jq '.[] | select(.parentExamId=="xxx") | {pageNumber, totalPages}

# 预期输出：
# {"pageNumber": 1, "totalPages": 5, ...}
# {"pageNumber": 2, "totalPages": 5, ...}
# ...
```

**OCR处理质量**：
- 每张图片独立进行 OCR 分析
- 串行处理确保稳定性（避免 API 并发限制）
- 每页生成独立的 `ScannedItem`，但共享 `parentExamId`

### 4.4 AnythingLLM 索引测试

**测试步骤**：
1. 保存一个扫描项后
2. 检查后端日志

```bash
docker-compose logs backend | grep "AnythingLLM"
```

**预期日志**：
```
[saveScannedItem] 原始图片已保存: /opt/hl-os/data/...
[saveScannedItem] Markdown已保存: /opt/hl-os/data/...
[indexToAnythingLLM] 索引成功: doc-xxx
```

---

## 5. 故障排查

### 5.1 保存失败："从服务器加载图书失败"

**原因**：后端服务未启动或端口冲突

**解决**：
```bash
# 检查后端服务状态
docker-compose ps backend

# 重启后端
docker-compose restart backend

# 查看错误日志
docker-compose logs backend | tail -50
```

### 5.2 分片上传失败

**症状**：大文件上传卡住或失败

**排查步骤**：
```bash
# 检查后端日志
docker-compose logs backend | grep -i "upload"

# 检查磁盘空间
df -h /opt/hl-os/data/uploads

# 检查临时目录
ls -lh /opt/hl-os/data/uploads/temp/
```

**常见原因**：
- 磁盘空间不足（清理临时文件）
- 分片索引超出范围
- 文件名包含非法字符

**解决**：
```bash
# 手动清理临时文件
rm -rf /opt/hl-os/data/uploads/temp/*

# 检查 cleanup 工具是否运行
docker-compose logs backend | grep -i "cleanup"

# 手动触发清理（如需要）
docker-compose exec backend node -e "require('./src/utils/cleanup.ts').then(c => c.cleanupTempChunks())"
```

### 5.3 临时文件占用过多空间

**症状**：`/opt/hl-os/data/uploads/temp/` 占用大量空间

**说明**：这是正常的，临时文件会在24小时后自动清理。

**手动清理**：
```bash
# 删除所有临时分片
rm -rf /opt/hl-os/data/uploads/temp/*

# 重启后端服务（确保清理任务仍在运行）
docker-compose restart backend
```

**验证清理任务**：
```bash
# 查看最近的清理日志
docker-compose logs backend | grep -i "清理"
# 预期：每小时看到清理日志
```

### 5.3 AnythingLLM 索引失败

**原因**：ANYTHINGLLM_API_KEY 未配置

**解决**：
```bash
# 检查环境变量
docker-compose exec backend env | grep ANYTHINGLLM

# 在 .env 中添加
echo "ANYTHINGLLM_API_KEY=your_token_here" >> .env
docker-compose restart backend
```

---

## 6. 性能监控

### 6.1 磁盘使用监控

```bash
# 检查数据目录大小
du -sh /opt/hl-os/data/*

# 预期占用：
# originals/images/: ~500MB (1000张图片)
# originals/books/: ~1.5GB (100个PDF)
# obsidian/: ~10MB (1000个Markdown)
# metadata.json: ~1MB
# 总计: ~2GB
```

### 6.2 内存使用监控

```bash
# Docker 容器资源占用
docker stats hl-backend hl-anythingllm

# 预期：
# hl-backend: < 512MB
# hl-anythingllm: < 1GB
```

---

## 7. 数据备份

### 7.1 自动备份脚本

创建 `/opt/hl-os/scripts/backup.sh`：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/opt/hl-os/backups/$DATE"

mkdir -p "$BACKUP_DIR"

# 备份 Obsidian 文件夹
tar -czf "$BACKUP_DIR/obsidian.tar.gz" /opt/hl-os/data/obsidian/

# 备份原始文件
tar -czf "$BACKUP_DIR/originals.tar.gz" /opt/hl-os/data/originals/

# 备份 AnythingLLM
tar -czf "$BACKUP_DIR/anythingllm.tar.gz" /opt/hl-os/anythingllm-storage/

# 备份元数据
cp /opt/hl-os/data/metadata.json "$BACKUP_DIR/"

echo "备份完成: $BACKUP_DIR"
```

### 7.2 设置 Cron 定时任务

```bash
# 编辑 crontab
crontab -e

# 添加每日凌晨3点备份
0 3 * * * /opt/hl-os/scripts/backup.sh

# 保留最近30天
0 4 * * * find /opt/hl-os/backups -type d -mtime +30 -exec rm -rf {} \;
```

---

## 8. 回滚方案

如果新架构出现问题，可以回滚到 IndexedDB 版本：

```bash
# 查看提交历史
git log --oneline | head -10

# 回滚到迁移前的版本（假设是 a2085d4）
git checkout a2085d4

# 重新构建
npm run build

# 重启服务
docker-compose restart backend nginx
```

**注意**：回滚后，新保存的数据仍在服务端 `/opt/hl-os/data/` 目录中，不会丢失。

---

## 9. 下一步优化

已完成的功能：
- ✅ 服务端文件存储
- ✅ Obsidian Markdown 生成
- ✅ AnythingLLM 自动索引
- ✅ 前端 API 集成

待优化功能：
- ⏳ 删除 API（目前删除功能暂禁用）
- ⏳ 批量导出（下载整个 Obsidian 库）
- ⏳ 离线模式（Service Worker 缓存）
- ⏳ 数据统计 Dashboard
- ✅ 分片上传（已完成，支持大文件和进度显示）

---

**测试完成后，请将测试结果反馈给开发团队**

---

## 10. 新增API端点（2026-01-21）

### 10.1 POST /api/upload-chunk

**功能**：上传文件分片

**请求**：
```json
{
  "chunk": "<binary data>",
  "chunkIndex": 0,
  "totalChunks": 10,
  "fileId": "session-uuid",
  "fileName": "large-book.pdf",
  "ownerId": "child_1"
}
```

**响应**：
```json
{
  "success": true
}
```

### 10.2 POST /api/upload-chunk?action=merge

**功能**：合并所有分片为最终文件

**请求**：
```json
{
  "fileId": "session-uuid",
  "fileName": "large-book.pdf",
  "ownerId": "child_1"
}
```

**响应**：
```json
{
  "success": true,
  "filePath": "/uploads/files/uuid.pdf"
}
```

**安全特性**：
- fileId 格式验证（防止路径遍历）
- fileName 净化处理
- 分片索引范围检查
- 文件大小限制（10MB/片）
- 最多10,000个分片

**使用场景**：
- 大文件上传（>5MB）
- 网络不稳定环境
- 需要进度反馈的场景
