# POC: Gemini 2.0 Flash 图书元数据提取验证

## 概述

本目录包含多个 POC 脚本，验证 Gemini 2.0 Flash 从 PDF 提取图书元数据的不同方法。

---

## POC 1: 封面识别提取（推荐）

### 测试目标

1. **验证 Gemini File API 是否能成功上传 PDF**
2. **验证 Gemini 2.0 Flash 能否通过封面识别提取元数据**
3. **对比封面识别 vs 文件名分析的准确度**

### 运行方式

#### Python 版本（推荐）

```bash
cd backend
python pocs/test.py <path-to-pdf-file>
```

**优点**：
- ✅ 网络连接稳定（使用 requests 库）
- ✅ 代码简洁，仅 30 行
- ✅ 已成功验证

#### TypeScript 版本

```bash
cd backend
npx tsx pocs/gemini-cover-poc.ts <path-to-pdf-file>
```

**已知问题**：
- ⚠️ Node.js 原生 fetch 在某些网络环境下可能超时
- ⚠️ 建议使用 Python 版本进行验证

### 预期输出

```
Uploading poc-test-1769158206241.pdf...
OK: https://generativelanguage.googleapis.com/v1beta/files/xxxx

Analyzing cover...
{
  "title": "健康教育",
  "author": "人民教育出版社课程教材研究所",
  "subject": "其他",
  "grade": "一年级",
  "publisher": "人民教育出版社",
  "publishDate": "2024年8月"
}
```

---

## POC 2: PDF 内容分析

### 1. 准备环境

确保 backend/.env 文件中已配置 `GEMINI_API_KEY`：

```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env 文件，填入真实的 API Key
# GEMINI_API_KEY=your_actual_api_key_here
```

### 2. 准备测试 PDF 文件

将测试 PDF 文件放在以下位置之一：
- 项目根目录: `/d/devops/HL-os/test-data/sample-book.pdf`
- 临时目录: `/tmp/test-book.pdf`
- 或在命令行中指定任意路径

### 3. 运行 POC

```bash
cd backend
npx tsx pocs/gemini-pdf-poc.ts <path-to-your-pdf-file>
```

### 4. 示例命令

```bash
# 使用指定的 PDF 文件
npx tsx pocs/gemini-pdf-poc.ts /d/devops/HL-os/test-data/textbook.pdf

# 或使用项目中的测试文件
npx tsx pocs/gemini-pdf-poc.ts test-data/sample-book.pdf
```

## 预期输出

POC 将依次执行以下步骤：

1. **方法 1: PDF 内容分析**
   - 上传 PDF 到 Gemini File API
   - 调用 Gemini 2.0 Flash 分析 PDF 内容
   - 提取图书元数据（书名、作者、学科、年级等）
   - 计算字段级和整体置信度

2. **方法 2: 文件名分析**
   - 使用现有方案基于文件名提取元数据
   - 作为对比基准

3. **对比分析**
   - 并排显示两种方法的提取结果
   - 比较置信度
   - 给出推荐方案

## 成功标准

- ✅ Gemini File API 成功上传 PDF（返回 File URI）
- ✅ Gemini 成功分析 PDF 内容并返回结构化 JSON
- ✅ PDF 内容分析的置信度 >= 文件名分析
- ✅ 提取的元数据包含实际信息（非空或非"未识别"）

## 技术要点

### Gemini File API

```typescript
const uploadResult = await genAI.files.upload({
  file: {
    data: pdfBuffer,
    mimeType: 'application/pdf',
    displayName: fileName,
  },
});

// 在 prompt 中引用上传的文件
const response = await genAI.models.generateContent({
  model: 'gemini-2.0-flash-exp',
  contents: [
    {
      role: 'user',
      parts: [
        { text: prompt },
        { fileData: { fileUri: uploadResult.file.uri, mimeType: 'application/pdf' } }
      ]
    }
  ],
  config: {
    responseMimeType: 'application/json',
    responseSchema: { /* ... */ }
  }
});
```

### 置信度评分

- **0.8-1.0**: PDF 中明确可见的信息（如封面上的书名）
- **0.5-0.7**: PDF 中隐含但可推断的信息
- **0.0-0.4**: PDF 中缺失或模糊的信息

## 下一步

如果 POC 验证成功，后续实现：

1. **集成到上传流程** - 在 `upload-book.ts` 中调用 PDF 内容分析
2. **封面图片提取** - 使用 pdf-lib 提取第一页作为缩略图
3. **回退策略** - PDF 分析失败时使用文件名分析
4. **数据库存储** - 保存提取的封面图片和元数据置信度

## 故障排查

### 错误: GEMINI_API_KEY not configured

确保 backend/.env 文件存在且包含有效的 API Key。

### 错误: File not found

检查 PDF 文件路径是否正确，可以使用绝对路径。

### 错误: Gemini API quota exceeded

等待一段时间后重试，或检查 API Key 的配额限制。

## 参考资料

- [Google Generative AI SDK](https://github.com/google/generative-ai-js)
- [Gemini File API](https://ai.google.dev/gemini-api/docs/files)
- [Gemini 2.0 Flash](https://ai.google.dev/gemini-api/docs/models/gemini)
