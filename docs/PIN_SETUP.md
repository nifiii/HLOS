# 家庭PIN码设置指南

**文档版本**: v1.0.0
**最后更新**: 2026-01-20
**用途**: 为智学 OS 提供简单的家庭用户认证机制

---

## 1. 默认PIN码

系统预置了两个角色的默认PIN码：

| 角色 | 默认PIN码 | 权限 |
|------|----------|------|
| **管理员（父母）** | 1234 | - 全部功能<br>- 可删除数据<br>- 可查看所有孩子的学习记录 |
| **学生（孩子）** | 0000 | - 拍题、学习<br>- 无法删除<br>- 无法切换到其他孩子的视图 |

---

## 2. 修改管理员PIN码

### 步骤 1: 编辑后端认证配置

SSH 登录服务器，编辑认证文件：

```bash
# SSH 登录服务器
ssh user@your-server

# 导航到项目目录
cd /opt/hl-os

# 编辑认证配置文件
nano backend/src/routes/auth.ts
```

找到以下行：

```typescript
const ADMIN_PIN_HASH = '$2b$10$...'; // 当前是"1234"的hash
```

### 步骤 2: 生成新PIN的 bcrypt hash

使用以下命令生成新的 bcrypt hash（将 `你的新PIN` 替换为实际的4位数字）：

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('你的新PIN', 10).then(hash => console.log(hash));"
```

示例（将PIN改为 `5678`）：

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('5678', 10).then(hash => console.log(hash));"
```

输出示例：

```
$2b$10$xYz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcd
```

### 步骤 3: 替换 hash 值

将生成的 hash 替换到 `backend/src/routes/auth.ts` 中的 `ADMIN_PIN_HASH` 值。

修改前：

```typescript
const ADMIN_PIN_HASH = '$2b$10$oldHashValue...'; // 当前是"1234"的hash
```

修改后：

```typescript
const ADMIN_PIN_HASH = '$2b$10$xYz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcd'; // 新PIN的hash
```

保存文件（Ctrl+O, Enter, Ctrl+X）。

---

## 3. 重启后端服务

### 方法 1: 使用 Docker Compose（推荐）

```bash
# 重新构建后端
cd /opt/hl-os/backend
npm run build

# 重启后端容器
cd /opt/hl-os
docker-compose restart backend

# 查看日志确认启动成功
docker-compose logs -f backend
```

### 方法 2: 使用 systemd（如果配置了系统服务）

```bash
# 重新构建后端
cd /opt/hl-os/backend
npm run build

# 重启服务
sudo systemctl restart hl-backend

# 查看状态
sudo systemctl status hl-backend
```

### 验证服务启动

```bash
# 健康检查
curl http://localhost:3000/api/health

# 预期响应��
# {"status":"ok","timestamp":1737360000000,"version":"1.0.0"}
```

---

## 4. 测试新PIN码

1. 打开浏览器访问 `http://your-server/`
2. 如果已登录，先登出（清除 LocalStorage 中的 sessionId）
3. 在登录界面输入新的管理员PIN码
4. 验证是否可以成功登录

---

## 5. 安全建议

### 5.1 PIN码选择

**推荐做法**：
- ✅ 使用4位数字，易记但不明显（如出生年月、纪念日）
- ✅ 定期更换（建议每3-6个月）
- ✅ 避免与生日、电话号码等公开信息相同

**不推荐做法**：
- ❌ 使用 `1234`、`0000`、`1111` 等简单序列
- ❌ 使用家庭门牌号、邮编等易推测数字
- ❌ 告诉孩子父母的PIN码

### 5.2 数据备份

修改PIN码前，建议先备份系统：

```bash
# 创建备份目录
sudo mkdir -p /opt/hl-os/backups

# 备份数据目录
DATE=$(date +%Y%m%d)
sudo tar -czf /opt/hl-os/backups/hl-os-data-$DATE.tar.gz /opt/hl-os/data

# 备份后端配置
sudo cp /opt/hl-os/backend/src/routes/auth.ts /opt/hl-os/backups/auth.ts.backup
```

### 5.3 忘记PIN码的恢复方案

如果忘记管理员PIN码，需要重新生成 hash：

```bash
# 临时生成新PIN的hash
cd /opt/hl-os/backend
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('新临时PIN', 10).then(hash => console.log(hash));"

# 编辑认证文件
nano src/routes/auth.ts

# 替换 ADMIN_PIN_HASH 并重启服务
npm run build
cd ..
docker-compose restart backend
```

---

## 6. 常见问题

### Q1: 修改PIN码后无法登录？

**原因**：
- bcrypt hash 生成错误
- 后端服务未正确重启
- 浏览器缓存了旧的 session

**解决方案**：
1. 验证 hash 是否正确复制（确保没有多余的空格或换行）
2. 确认后端服务已重启：`docker-compose ps backend`
3. 清除浏览器 LocalStorage：`F12 → Application → Local Storage → Clear`
4. 重新输入PIN码

### Q2: 学生PIN码可以修改吗？

**答**：当前学生PIN码固定为 `0000`，这是设计决定，方便孩子快速进入学习界面。

如需修改，编辑 `backend/src/routes/auth.ts` 中的学生PIN验证逻辑：

```typescript
// 找到这行：
if (pin === '0000') {

// 修改为：
if (pin === '新的学生PIN') {
```

### Q3: 如何完全禁用PIN码认证？

**警告**：禁用认证后，任何人都可以访问系统并删除数据，不推荐！

编辑 `App.tsx`，注释掉登录检查逻辑：

```typescript
// 注释掉以下行：
// useEffect(() => {
//   checkSession();
// }, []);
```

---

## 7. 技术细节

### 7.1 bcrypt 工作原理

- **算法**: bcrypt (基于 Blowfish 加密)
- **轮次**: 10 rounds（安全性与性能的平衡）
- **盐值**: 每次哈希自动生成，防止彩虹表攻击
- **输出**: 60字符的字符串，包含算法、轮次、盐值和哈希值

### 7.2 Session 存储机制

- **存储位置**: 后端内存（`Map` 数据结构）
- **Session 内容**: `{ sessionId, role, userId, createdAt }`
- **过期机制**: 浏览器关闭后 session 失效（无服务器端过期）
- **安全性**: sessionID 使用 UUID v4，无法猜测

### 7.3 防暴力破解

当前实现暂未包含失败锁定机制。建议通过以下方式增强安全：

**使用 Nginx 限流**：

```nginx
# 在 nginx.conf 中添加：
http {
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    server {
        location /api/auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            # ... 其他配置
        }
    }
}
```

这会限制每个IP每分钟最多5次登录请求。

---

## 8. 下一步优化方向

完成 Dashboard 实时统计后，可继续实施：

1. **用户认证功能**（P1优先级）
   - 创建 LoginModal 组件
   - 实现后端认证 API
   - 集成到 App.tsx

2. **删除功能**（P2优先级）
   - 实现后端删除 API
   - 前端删除按钮重新启用
   - 添加二次确认

---

**如有问题，请提交 Issue 或联系维护者。**
