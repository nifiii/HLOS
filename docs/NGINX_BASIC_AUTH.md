# Nginx Basic Auth 家庭访问控制指南

**文档版本**: v1.0.0
**最后更新**: 2026-01-20
**用途**: 为智学 OS 提供简单、安全的家庭访问控制

---

## 1. 设计理念

### 1.1 为什么选择 Nginx Basic Auth

**✅ 优势**：
- **简单可靠**：Nginx内置功能，无需额外开发
- **安全性高**：HTTP Basic Authentication协议成熟
- **家庭友好**：单个密码，全家人共享
- **无角色区分**：信任和信息平等，避免权限复杂性
- **HTTPS支持**：可与SSL证书配合使用

**❌ 不需要**：
- ❌ 复杂的用户角色管理（管理员/学生）
- ❌ 前端登录框和PIN码输入
- ❌ Session管理和过期处理
- ❌ 多租户隔离（家庭单租户场景）

### 1.2 适用场景

✅ **适用**：
- 家庭私有部署（2C4G服务器）
- 3-5人的小家庭使用
- 内网环境（192.168.x.x 或 10.x.x.x）
- 需要基础访问控制（防止外人访问）

⚠️ **不适用**：
- 公网部署且无HTTPS（密码明文传输）
- 需要细粒度权限控制（多角色）
- 多租户SaaS场景

---

## 2. 快速开始

### 2.1 安装 htpasswd 工具

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install -y apache2-utils
```

**CentOS/RHEL**:
```bash
sudo yum install -y httpd-tools
```

**验证安装**:
```bash
htpasswd -v
# 输出示例: htpasswd version 2.4.3
```

### 2.2 创建密码文件

**步骤**：
```bash
# 1. 创建密码文件目录
sudo mkdir -p /etc/nginx/auth

# 2. 生成密码文件（用户名: family）
sudo htpasswd -c /etc/nginx/auth/.htpasswd family

# 3. 输入密码并确认
New password: 你的密码
Re-type new password: 你的密码

# 4. 验证文件创建
cat /etc/nginx/auth/.htpasswd
```

**输出示例**:
```
family:$apr1$ZwEqEj5z$XxHxHxHxHxHxHxHxHxHxHx
```

### 2.3 配置 Nginx

**编辑 nginx 配置**:
```bash
sudo nano /etc/nginx/sites-available/hl-os
```

**添加 basic auth 配置**:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或 IP地址

    # Basic Auth 配置
    auth_basic "智学 OS - 家庭访问";
    auth_basic_user_file /etc/nginx/auth/.htpasswd;

    # 前端静态文件
    location / {
        root /opt/hl-os/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API 反向代理
    location /api/ {
        auth_basic "智学 OS - 家庭访问";
        auth_basic_user_file /etc/nginx/auth/.htpasswd;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # AnythingLLM 管理界面（可选，如果需要外部访问）
    location /anythingllm/ {
        # 如果需要额外保护 AnythingLLM
        # auth_basic "AnythingLLM 管理员";
        # auth_basic_user_file /etc/nginx/auth/.htpasswd;

        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### 2.4 测试配置并重启

```bash
# 1. 测试 Nginx 配置语法
sudo nginx -t

# 预期输出:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# 2. 重启 Nginx
sudo systemctl restart nginx

# 3. 验证 Nginx 运行状态
sudo systemctl status nginx
```

---

## 3. 访问测试

### 3.1 浏览器访问

**步骤**：
1. 打开浏览器，访问 `http://your-server-ip/`
2. 应弹出登录提示框
3. 输入用户名：`family`
4. 输入密码：你设置的密码
5. 点击"登录"或"确定"

**预期结果**：
- ✅ 登录成功后进入智学 OS
- ✅ 可以正常使用所有功能
- ✅ 关闭浏览器后需重新登录

### 3.2 验证保护

**测试步骤**：
1. 打开无痕/隐私浏览窗口
2. 访问 `http://your-server-ip/`
3. 不输入密码，直接取消

**预期结果**：
- ✅ 显示"401 Unauthorized"错误
- ✅ 无法访问应用内容
- ✅ API端点也被保护

---

## 4. 密码管理

### 4.1 修改密码

**方法 1: 覆盖现有密码文件**
```bash
# ⚠️ 注意：这会覆盖所有现有用户
sudo htpasswd -c /etc/nginx/auth/.htpasswd family
```

**方法 2: 添加/更新用户（推荐）**
```bash
# 更新现有用户密码
sudo htpasswd /etc/nginx/auth/.htpasswd family
```

**重启 Nginx 使更改生效**:
```bash
sudo nginx -s reload
```

### 4.2 添加多个家庭成员（可选）

如果你希望每个家庭成员有自己的账号：

```bash
# 添加爸爸
sudo htpasswd /etc/nginx/auth/.htpasswd dad

# 添加妈妈
sudo htpasswd /etc/nginx/auth/.htpasswd mom

# 添加大宝
sudo htpasswd /etc/nginx/auth/.htpasswd child1

# 添加二宝
sudo htpasswd /etc/nginx/auth/.htpasswd child2
```

**验证所有用户**:
```bash
cat /etc/nginx/auth/.htpasswd
```

**输出示例**:
```
dad:$apr1$XxXxXxXx$xXxXxXxXxXxXxXxXxXxX
mom:$apr1$YyYyYyYy$yYyYyYyYyYyYyYyYyYyYy
child1:$apr1$ZzZzZzZz$zZzZzZzZzZzZzZzZzZzZ
family:$apr1$WwWwWwWw$wWwWwWwWwWwWwWwWwWw
```

**优势**：
- 每个孩子有自己的账号
- 可以后续追踪谁访问了系统（如果需要）
- 仍然保持信息平等（无角色权限区分）

---

## 5. HTTPS 配置（推荐）

### 5.1 为什么需要 HTTPS

**HTTP Basic Auth 的安全问题**：
- ❌ 密码Base64编码，几乎等同于明文传输
- ❌ 容易被网络嗅探拦截
- ❌ 不适合公网部署

**HTTPS 的优势**：
- ✅ 加密传输，保护密码安全
- ✅ 防止中间人攻击
- ✅ 适合公网部署

### 5.2 使用 Let's Encrypt 免费 SSL

**安装 Certbot**:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

**获取 SSL 证书**:
```bash
sudo certbot --nginx -d your-domain.com
```

**Certbot 会自动**：
1. 获取SSL证书
2. 修改 Nginx 配置，添加 HTTPS
3. 配置自动续期

**验证 HTTPS**:
```bash
# 访问 https://your-domain.com/
# 浏览器应显示 🔒 图标
```

---

## 6. 安全建议

### 6.1 密码强度

**推荐做法**：
- ✅ 使用12位以上密码
- ✅ 包含大小写字母、数字、符号
- ✅ 定期更换（建议每3-6个月）

**示例强密码**：
```
HappyFamily@2024!
HomeLearning#8848
```

**不推荐做法**：
- ❌ 使用简单密码（123456, password）
- ❌ 使用家庭生日或���牌号
- ❌ 告诉家庭成员以外的人

### 6.2 网络安全

**内网部署**（推荐）：
- ✅ 仅在内网使用（192.168.x.x）
- ✅ 关闭公网访问端口（80/443）
- ✅ 使用路由器防火墙

**公网部署**（需HTTPS）：
- ⚠️ 必须配置 HTTPS
- ⚠️ 使用强密码
- ⚠️ 定期更新系统
- ⚠️ 配置防火墙（UFW/Fail2ban）

### 6.3 备份

**备份密码文件**:
```bash
# 创建备份目录
sudo mkdir -p /opt/hl-os/backups

# 备份密码文件
sudo cp /etc/nginx/auth/.htpasswd /opt/hl-os/backups/.htpasswd.backup

# 设置定时备份（可选）
echo "0 2 * * * cp /etc/nginx/auth/.htpasswd /opt/hl-os/backups/.htpasswd.$(date +\%Y\%m\%d)" | sudo crontab -
```

---

## 7. 故障排查

### 7.1 登录框不弹出

**原因**：
- 浏览器已缓存密码
- Nginx配置未生效

**解决方案**：
```bash
# 1. 清除浏览器缓存
# Chrome: F12 → Network → Disable cache
# Firefox: Ctrl+Shift+Delete

# 2. 使用无痕/隐私模式测试

# 3. 验证 Nginx 配置
sudo cat /etc/nginx/sites-available/hl-os | grep auth_basic

# 4. 重新加载 Nginx
sudo nginx -s reload
```

### 7.2 密码验证失败

**原因**：
- 密码文件路径错误
- 密码文件权限不正确
- Nginx进程用户无读取权限

**解决方案**：
```bash
# 1. 检查密码文件是否存在
ls -lh /etc/nginx/auth/.htpasswd

# 2. 检查文件权限（应该是644或更严格）
sudo chmod 644 /etc/nginx/auth/.htpasswd

# 3. 检查文件所有者（应该是www-data或nginx）
sudo chown www-data:www-data /etc/nginx/auth/.htpasswd

# 4. 验证 Nginx 用户
ps aux | grep nginx | grep worker

# 5. 如果需要，调整所有者
sudo chown -R nginx:nginx /etc/nginx/auth/
```

### 7.3 401 Unauthorized 仍然出现

**原因**：
- 密码输入错误
- 密码文件格式损坏
- Nginx配置错误

**解决方案**：
```bash
# 1. 验证密码文件格式
cat /etc/nginx/auth/.htpasswd
# 应显示: username:$apr1$...

# 2. 重新生成密码文件
sudo htpasswd -c /etc/nginx/auth/.htpasswd family

# 3. 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 4. 测试 Nginx 配置
sudo nginx -t
```

### 7.4 HTTPS 配置问题

**问题**：证书无法获取

**原因**：
- 域名DNS未指向服务器
- 80端口被防火墙阻止
- 端口被其他程序占用

**解决方案**：
```bash
# 1. 验证DNS解析
nslookup your-domain.com

# 2. 检查80端口开放
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. 检查端口占用
sudo netstat -tlnp | grep :80

# 4. 查看Certbot日志
sudo cat /var/log/letsencrypt/letsencrypt.log
```

---

## 8. 升级路径

### 8.1 当前方案（推荐）

**Nginx Basic Auth**
- ✅ 简单可靠
- ✅ 无需开发维护
- ✅ 家庭信任平等
- ✅ 单一密码共享

### 8.2 未来可选方案（如需要）

**如果未来需要更复杂的功能**：

1. **OAuth/SSO登录**（Google/Facebook）
   - 适合：公网SaaS服务
   - 不适合：家庭私有部署

2. **多角色权限系统**
   - 适合：大企业/学校
   - 不适合：家庭小场景

3. **双因素认证（2FA）**
   - 适合：高安全要求场景
   - 不适合：家庭日常使用

**当前建议**: 保持简单，使用 Nginx Basic Auth 即可。

---

## 9. 快速参考

### 常用命令

```bash
# 创建/更新密码
sudo htpasswd /etc/nginx/auth/.htpasswd family

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 重载Nginx（不中断连接）
sudo nginx -s reload

# 查看Nginx状态
sudo systemctl status nginx

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

### 配置文件路径

```
密码文件: /etc/nginx/auth/.htpasswd
Nginx配置: /etc/nginx/sites-available/hl-os
错误日志: /var/log/nginx/error.log
访问日志: /var/log/nginx/access.log
```

### 默认凭据

```
用户名: family
密码: （你自己设置的）
```

---

**如有问题，请参考 Nginx 官方文档或提交 Issue。**
