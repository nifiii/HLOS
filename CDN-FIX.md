# CDN 问题修复说明

## 问题根因

之前的部署依赖多个国外 CDN 资源，导致在中国大陆访问时出现：
- "module is not defined" 错误
- 页面加载失败或缓慢
- 资源加载超时

**原有 CDN 依赖：**
1. Tailwind CSS: `https://fastly.jsdelivr.net/npm/tailwindcss@3.4.1/`
2. FontAwesome: `https://fastly.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/`
3. React 及依赖: 通过 `esm.sh` 的 importmap

## 修复方案

### 核心改动

**全量本地化打包**：所有依赖通过 Vite 打包为本地资源，零 CDN 依赖。

### 具体改动文件

#### 1. package.json
新增本地依赖：
```json
"devDependencies": {
  "@fortawesome/fontawesome-free": "^6.5.1",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32",
  "tailwindcss": "^3.4.1"
}
```

#### 2. 新增配置文件

**tailwind.config.js** - Tailwind 配置（含品牌色和字体）

**postcss.config.js** - PostCSS 配置

**src/index.css** - 统一样式入口
- 导入 FontAwesome
- Tailwind 指令
- 全局样式（loading overlay 等）

#### 3. index.html（核心改动）

**移除：**
- `<script type="importmap">` 整个块
- Tailwind CDN script 标签
- FontAwesome CDN link 标签
- Tailwind 配置 script 块
- 内联的全局 CSS（除加载动画外）

**保留：**
- 加载动画的关键 CSS（内联，避免闪烁）
- 容错逻辑脚本

#### 4. index.tsx
新增：`import './src/index.css';`（第一行）

## 构建验证

```bash
npm install
npm run build
```

**构建产物（dist/）：**
```
dist/
├── index.html                                # 2.83 KB
├── assets/
│   ├── index-D_5N4jcl.js                     # 580 KB (含 React + 业务逻辑)
│   ├── index-zoCwQ4cM.css                    # 76 KB (含 Tailwind + FontAwesome)
│   ├── fa-solid-900-CTAAxXor.woff2           # 158 KB
│   ├── fa-brands-400-D_cYUPeE.woff2          # 118 KB
│   ├── fa-regular-400-BjRzuEpd.woff2         # 25 KB
│   └── ... (其他字体文件)
```

**验证点：**
```bash
# 确认无 CDN 引用
grep -i "cdn\|esm.sh\|jsdelivr" dist/index.html  # 应无输出
```

## 部署步骤

### 方式一：使用现有脚本（推荐）
```bash
# 自动编译 + 部署
sudo ./deploy-hybrid.sh
```

### 方式二：手动部署
```bash
# 1. 本地构建（在 Windows 开发机）
npm install
npm run build

# 2. 打包前端
cd dist
tar czf frontend.tar.gz .

# 3. 上传到服务器
scp frontend.tar.gz root@47.79.4.52:/tmp/

# 4. 服务器端部署
ssh root@47.79.4.52
cd /opt/hl-os/frontend
rm -rf *
tar xzf /tmp/frontend.tar.gz -C .
systemctl reload nginx
```

## 验证部署

### 1. 检查资源加载
```bash
curl http://jia.haokuai.uk/ | grep -E '<script|<link'
```
应看到类似：
```html
<script type="module" crossorigin src="/assets/index-XXXXX.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-XXXXX.css">
```

### 2. 检查字体文件
```bash
ls -lh /opt/hl-os/frontend/assets/ | grep woff2
```
应看到 FontAwesome 字体文件。

### 3. 浏览器测试
- 打开开发者工具 Network 面板
- 访问 http://jia.haokuai.uk/
- **确认：所有资源请求 Host 为 jia.haokuai.uk**
- **确认：无 esm.sh / jsdelivr.net 请求**

## 预期效果

✅ **解决问题：**
- "module is not defined" 错误消失
- 中国大陆访问速度正常
- 无需依赖国外 CDN，稳定性提升

✅ **副作用：**
- 初次加载资源体积增加（~580KB JS + ~76KB CSS + 字体）
- 但通过 Nginx gzip 后实际传输约 180KB
- 首屏加载后浏览器会缓存，后续访问更快

## 技术细节

### Vite 打包机制
Vite 在生产构建时会：
1. 解析 index.tsx 中的所有 import
2. 将 node_modules 中的依赖打包到 assets/index-XXXXX.js
3. 将 CSS（含 Tailwind 和 FontAwesome）打包到 assets/index-XXXXX.css
4. 将字体文件复制到 assets/ 并重命名（content hash）
5. 自动更新 index.html 中的引用路径

### 为什么不用 importmap？
importmap 依赖外部 ESM CDN (esm.sh)，在中国网络环境下不稳定。
本地打包虽然增加体积，但保证可靠性。

### CSS 导入顺序
```css
/* 必须最先导入外部 CSS */
@import '@fortawesome/fontawesome-free/css/all.min.css';

/* 然后是 Tailwind 指令 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 回滚方案

如需回滚到 CDN 版本：
```bash
cd /opt/hl-os
git checkout HEAD~1 -- index.html package.json
rm -f tailwind.config.js postcss.config.js src/index.css
npm install
npm run build
./deploy-hybrid.sh
```

## 常见问题

**Q: 为什么字体文件这么大？**
A: FontAwesome 包含 3 套完整字体（Solid/Regular/Brands），每套 25-426KB。如需优化，可以只引入使用的图标集。

**Q: 能否继续使用 CDN 加速？**
A: 可以，但需要使用国内 CDN（如 unpkg.com 的国内镜像），并在 index.html 中手动添加。不推荐，因为会重新引入依赖问题。

**Q: 构建后 JS 文件太大怎么办？**
A: 当前 580KB 在生产环境经过 gzip 后约 150KB，属于正常范围。如需优化，可考虑：
- 代码分割（动态 import）
- 按需加载 AI 模型相关代码
- Tree-shaking 优化（需分析依赖）

## 测试清单

部署后必须完成：

- [ ] 访问 http://jia.haokuai.uk/，页面正常显示
- [ ] 浏览器控制台无 "module is not defined" 错误
- [ ] Network 面板无红色失败请求
- [ ] Network 面板无国外域名请求（esm.sh/jsdelivr.net）
- [ ] FontAwesome 图标正常显示
- [ ] Tailwind 样式正常应用
- [ ] 切换用户、导航等交互功能正常
- [ ] 移动端访问正常（响应式布局）

---

**修复完成时间：** 2026-01-20
**修复人员：** Claude Code
**验证状态：** ✅ 本地构建通过，待服务器部署验证
