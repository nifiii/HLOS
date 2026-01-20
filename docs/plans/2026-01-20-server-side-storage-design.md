# 服务端数据持久化存储架构设计

**日期**: 2026-01-20
**目标**: 将前端 IndexedDB 存储迁移到服务端文件系统 + AnythingLLM 向量数据库
**服务器约束**: 2C4G

---

## 1. 问题陈述

**当前状态**:
- ❌ `EBook` 数据存储在浏览器 IndexedDB（无法跨设备）
- ❌ `ScannedItem` 数据仅存在于内存（刷新丢失）
- ❌ 数据无法在多设备间同步

**用户需求**:
- ✅ 所有数据持久化在服务端
- ✅ 通过 API 接口访问数据
- ✅ 支持跨设备同步
- ✅ 轻量级方案（适配 2C4G 服务器）

---

## 2. 架构设计

### 2.1 三层存储架构

```
层级1: AnythingLLM (LanceDB 向量数据库)
├─ 用途: RAG检索、语义搜索
├─ 存储: 文本内容向量化 + 文件路径元数据
└─ 配置: Gemini text-embedding-004

层级2: Obsidian文件夹 (/opt/hl-os/data/obsidian/)
├─ Wrong_Problems/  (错题本)
├─ No_Problems/     (试卷作业)
└─ Courses/         (课件测验)

层级3: 原始文件目录 (/opt/hl-os/data/originals/)
├─ images/  (原始图片 - 按月归档)
└─ books/   (电子教材 PDF/EPUB)
```

### 2.2 目录结构

```bash
/opt/hl-os/data/
├── obsidian/
│   ├── Wrong_Problems/
│   │   ├── 大宝/数学/2026-01-20_三角函数_abc123.md
│   │   └── 二宝/英语/...
│   ├── No_Problems/
│   │   └── 大宝/数学/2026-01-18_期末卷_def456.md
│   └── Courses/
│       └── 大宝/数学/2026-01-19_第二章课件.md
├── originals/
│   ├── images/2026-01/20_143022_abc123.jpg
│   └── books/2026-01/高中数学必修1.pdf
└── metadata.json  (元数据索引)
```

---

## 3. API 设计

### 3.1 保存扫描项

```typescript
POST /api/save-scanned-item

请求体:
{
  "scannedItem": ScannedItem,
  "originalImageBase64": string
}

响应:
{
  "success": true,
  "data": {
    "mdPath": "/opt/hl-os/data/obsidian/Wrong_Problems/...",
    "imagePath": "/opt/hl-os/data/originals/images/...",
    "anythingLlmDocId": "xxx"
  }
}
```

**处理流程**:
1. 保存原始图片到 `originals/images/YYYY-MM/DD_HHMMSS_id.jpg`
2. 生成 Obsidian Markdown 文件
3. 保存 Markdown 到 `obsidian/Wrong_Problems/用户名/学科/日期_主题_id.md`
4. 推送元数据到 AnythingLLM（包含 `mdPath` 和 `imagePath`）
5. 返回文件路径

### 3.2 查询扫描项列表

```typescript
GET /api/scanned-items?ownerId=child_1&subject=数学&type=wrong_problem

响应:
{
  "success": true,
  "data": ScannedItem[]  // 包含 mdPath 和 imagePath
}
```

**实现方式**:
- 从 `/opt/hl-os/data/metadata.json` 读取索引
- 按条件过滤
- 返回元数据列表（不包含完整内容，点击时才加载）

### 3.3 获取单个扫描项

```typescript
GET /api/scanned-items/:id

响应:
{
  "success": true,
  "data": {
    "scannedItem": ScannedItem,
    "markdown": string  // 从文件读取的完整内容
  }
}
```

### 3.4 保存教材

```typescript
POST /api/save-book

请求: multipart/form-data
- file: PDF/EPUB文件
- metadata: JSON字符串

响应:
{
  "success": true,
  "data": {
    "filePath": "/opt/hl-os/data/originals/books/2026-01/...",
    "anythingLlmDocId": "xxx"
  }
}
```

### 3.5 查询教材列表

```typescript
GET /api/books?ownerId=child_1&subject=数学

响应:
{
  "success": true,
  "data": EBook[]
}
```

---

## 4. 数据模型扩展

### 4.1 ScannedItem 扩展

```typescript
interface ScannedItem {
  id: string;
  ownerId: string;
  timestamp: number;
  imageUrl: string;        // 保留兼容性
  mdPath: string;          // 新增：Markdown文件路径
  imagePath: string;       // 新增：原始图片路径
  rawMarkdown: string;
  meta: StructuredMetaData;
  status: ProcessingStatus;
  anythingLlmDocId?: string;
}
```

### 4.2 EBook 扩展

```typescript
interface EBook {
  id: string;
  title: string;
  fileFormat: 'pdf' | 'epub' | 'txt';
  fileSize: number;
  uploadedAt: number;
  ownerId: string;
  filePath: string;        // 新增：原始文件路径
  subject: string;
  category: string;
  grade: string;
  tags: string[];
  tableOfContents: ChapterNode[];
  indexStatus: IndexStatus;
  anythingLlmDocId?: string;
}
```

---

## 5. 前端改造

### 5.1 移除 IndexedDB

**删除文��**:
- `services/bookStorage.ts`

**新增文件**:
- `services/apiService.ts` - API调用封装

### 5.2 App.tsx 改造

```typescript
// 改造前
useEffect(() => {
  const loadBooks = async () => {
    const allBooks = await getAllBooks(); // IndexedDB
    setBooks(allBooks);
  };
  loadBooks();
}, []);

// 改造后
useEffect(() => {
  const loadBooks = async () => {
    try {
      const allBooks = await fetchBooks(currentUser.id);
      setBooks(allBooks);
    } catch (error) {
      setErrorMsg('加载图书失败');
    }
  };
  loadBooks();
}, [currentUser.id]);
```

### 5.3 CaptureModule 改造

```typescript
const handleSaveAndArchive = async () => {
  if (reviewItem) {
    try {
      setSaving(true);
      const paths = await saveScannedItemToServer(reviewItem, imageBase64);
      onScanComplete({
        ...reviewItem,
        mdPath: paths.mdPath,
        imagePath: paths.imagePath
      });
      confetti({ particleCount: 100 });
    } catch (error) {
      setErrorMsg('保存失败');
    } finally {
      setSaving(false);
    }
  }
};
```

---

## 6. 实施计划

### 阶段1: 后端文件存储服务 (P0)

1. **创建 `backend/src/services/fileStorage.ts`**
   - `ensureDirectoryStructure()` - 确保目录存在
   - `saveOriginalImage()` - 保存原始图片
   - `saveObsidianMarkdown()` - 保存 Markdown 文件
   - `saveBookFile()` - 保存教材文件
   - `readMarkdownFile()` - 读取 Markdown 内容
   - `updateMetadataIndex()` - 更新元数据索引

2. **创建 API 端点 (`backend/src/routes/`)**
   - `saveScannedItem.ts` - POST /api/save-scanned-item
   - `scannedItems.ts` - GET /api/scanned-items, GET /api/scanned-items/:id
   - `saveBook.ts` - POST /api/save-book (改造现有 upload-book.ts)
   - `books.ts` - GET /api/books

### 阶段2: 前端 API 服务层 (P1)

3. **创建 `services/apiService.ts`**
   - `saveScannedItemToServer()`
   - `fetchScannedItems()`
   - `fetchScannedItemById()`
   - `saveBookToServer()`
   - `fetchBooks()`

### 阶段3: 前端集成 (P1)

4. **修改 `App.tsx`**
   - 移除 `getAllBooks()` 调用
   - 改用 `fetchBooks(currentUser.id)`
   - 添加 `scannedItems` 加载逻辑

5. **修改 `CaptureModule.tsx`**
   - 集成 `saveScannedItemToServer()`
   - 保存成功后添加 `mdPath` 和 `imagePath`

6. **修改 `LibraryHub.tsx` + `BookUploader.tsx`**
   - 改用 `/api/save-book`
   - 移除 `bookStorage.ts` 依赖

### 阶段4: AnythingLLM 集成 (P2)

7. **完善 AnythingLLM 索引**
   - 文件保存成功后自动索引
   - 元数据包含文件路径

### 阶段5: 测试 (P3)

8. **端到端测试**
   - 测试完整拍题保存流程
   - 测试跨设备同步
   - 测试数据加载

---

## 7. 风险与应对

| 风险 | 应对方案 |
|------|---------|
| Docker 容器文件权限问题 | 挂载目录设置 `USER:www-data` |
| AnythingLLM API 变更 | 封装客户端，统一版本管理 |
| 大量文件导致性能下降 | 按月归档，定期归档旧数据 |
| metadata.json 文件损坏 | 每日备份，提供恢复脚本 |

---

## 8. 回滚方案

如果新架构出现问题：

```bash
# 1. 回滚代码
git checkout <previous-commit>

# 2. 重新构建前端
npm run build

# 3. 重启服务
docker-compose restart backend

# 4. 数据不会丢失（IndexedDB 本地数据仍在）
```

---

## 9. 资源占用估算

- AnythingLLM (LanceDB): ~500MB
- Obsidian 文件夹: ~10MB
- 原始文件: ~2GB
- **总计**: ~2.5GB（完全可接受）

---

**设计完成，准备实施**
