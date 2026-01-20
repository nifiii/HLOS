import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 文件存储服务
 * 负责将数据保存到服务端文件系统（Obsidian + 原始文件）
 */

// 基础路径配置
const BASE_DIR = process.env.DATA_DIR || '/opt/hl-os/data';
const OBSIDIAN_DIR = path.join(BASE_DIR, 'obsidian');
const ORIGINALS_DIR = path.join(BASE_DIR, 'originals');
const METADATA_FILE = path.join(BASE_DIR, 'metadata.json');

// 目录映射
const DIR_MAP = {
  wrong_problem: 'Wrong_Problems',
  exam_paper: 'No_Problems',
  homework: 'No_Problems',
  note: 'No_Problems',
  courseware: 'Courses',
  mock_exam: 'Courses',
} as const;

/**
 * 确保目录结构存在
 */
export async function ensureDirectoryStructure(): Promise<void> {
  const dirs = [
    OBSIDIAN_DIR,
    path.join(OBSIDIAN_DIR, 'Wrong_Problems'),
    path.join(OBSIDIAN_DIR, 'No_Problems'),
    path.join(OBSIDIAN_DIR, 'Courses'),
    path.join(ORIGINALS_DIR, 'images'),
    path.join(ORIGINALS_DIR, 'books'),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`创建目录失败: ${dir}`, error);
    }
  }

  // 确保元数据文件存在
  try {
    await fs.access(METADATA_FILE);
  } catch {
    await fs.writeFile(METADATA_FILE, JSON.stringify([]));
  }
}

/**
 * 保存原始图片到文件系统
 * @param base64Data - 图片的base64编码
 * @param ownerId - 用户ID
 * @returns 图片文件路径
 */
export async function saveOriginalImage(
  base64Data: string,
  ownerId: string
): Promise<string> {
  await ensureDirectoryStructure();

  // 提取 base64 数据
  const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64String, 'base64');

  // 生成文件名: DD_HHMMSS_uuid.jpg
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const fileName = `${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}_${uuidv4().slice(0, 8)}.jpg`;

  // 按月归档: YYYY-MM/
  const monthDir = dateStr.slice(0, 7); // YYYY-MM
  const targetDir = path.join(ORIGINALS_DIR, 'images', monthDir);

  await fs.mkdir(targetDir, { recursive: true });
  const filePath = path.join(targetDir, fileName);

  await fs.writeFile(filePath, buffer);

  return filePath;
}

/**
 * 生成 Obsidian Markdown 文件内容
 */
function generateObsidianMarkdown(
  scannedItem: any,
  userName: string,
  imagePath?: string
): string {
  const { meta, rawMarkdown, timestamp } = scannedItem;
  const date = new Date(timestamp);

  // Frontmatter (YAML前置)
  const frontmatter = `---
type: ${meta.type}
subject: ${meta.subject}
chapter: ${meta.chapter_hint || ''}
knowledge_status: ${meta.knowledge_status || '未知'}
owner: ${scannedItem.ownerId}
created: ${date.toISOString()}
${imagePath ? `imagePath: ${imagePath}` : ''}
problems_count: ${meta.problems?.length || 0}
tags: [${meta.subject}, ${meta.chapter_hint || '综合'}, ${meta.type}]
---

# ${meta.subject} - ${meta.chapter_hint || '综合'} (${date.toLocaleDateString('zh-CN')})

`;

  // 题目详情
  const problemsSection = meta.problems && meta.problems.length > 0
    ? `
## 题目详情

${meta.problems.map((p: any, idx: number) => `
### 题目 ${idx + 1}: ${p.questionNumber || `Q${idx + 1}`}

**原题内容：**
${p.content}

**学生作答：**
${p.studentAnswer || '未作答'}

**教师批改：**
${p.teacherComment || '无'}

**订正记录：**
${p.correction || '未订正'}

**状态：** ${p.status === 'WRONG' ? '❌ 错误' : p.status === 'CORRECTED' ? '✏️ 已订正' : '✅ 正确'}
`).join('\n')}
`
    : '';

  // 原始内容
  const rawContentSection = `
## 原始识别内容

${rawMarkdown}
`;

  return frontmatter + problemsSection + rawContentSection;
}

/**
 * 保存 Obsidian Markdown 文件
 * @param scannedItem - 扫描项数据
 * @param userName - 用户名（用于文件夹命名）
 * @param imagePath - 原始图片路径（可选）
 * @returns Markdown 文件路径
 */
export async function saveObsidianMarkdown(
  scannedItem: any,
  userName: string,
  imagePath?: string
): Promise<string> {
  await ensureDirectoryStructure();

  const { meta, timestamp } = scannedItem;
  const date = new Date(timestamp);

  // 确定目标文件夹
  const docType = meta.type as keyof typeof DIR_MAP;
  const categoryDir = DIR_MAP[docType] || 'No_Problems';

  // 生成文件名: YYYY-MM-DD_主题_uuid.md
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const topic = (meta.chapter_hint || meta.subject || '综合').replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `${dateStr}_${topic}_${uuidv4().slice(0, 8)}.md`;

  // 构建完整路径: obsidian/Wrong_Problems/大宝/数学/
  const targetDir = path.join(
    OBSIDIAN_DIR,
    categoryDir,
    userName,
    meta.subject || '综合'
  );

  await fs.mkdir(targetDir, { recursive: true });
  const filePath = path.join(targetDir, fileName);

  // 生成 Markdown 内容
  const markdown = generateObsidianMarkdown(scannedItem, userName, imagePath);

  await fs.writeFile(filePath, markdown, 'utf-8');

  return filePath;
}

/**
 * 保存教材文件
 * @param fileBuffer - 文件二进制数据
 * @param fileName - 原始文件名
 * @param ownerId - 用户ID
 * @returns 文件路径
 */
export async function saveBookFile(
  fileBuffer: Buffer,
  fileName: string,
  ownerId: string
): Promise<string> {
  await ensureDirectoryStructure();

  // 按月归档: YYYY-MM/
  const now = new Date();
  const monthDir = now.toISOString().slice(0, 7); // YYYY-MM
  const targetDir = path.join(ORIGINALS_DIR, 'books', monthDir);

  await fs.mkdir(targetDir, { recursive: true });
  const filePath = path.join(targetDir, fileName);

  await fs.writeFile(filePath, fileBuffer);

  return filePath;
}

/**
 * 保存课件/测验 Markdown
 * @param ownerId - 用户ID
 * @param userName - 用户名
 * @param subject - 学科
 * @param chapter - 章节
 * @param content - Markdown 内容
 * @param type - 类型（courseware/quiz）
 * @returns Markdown 文件路径
 */
export async function saveCoursewareMarkdown(
  ownerId: string,
  userName: string,
  subject: string,
  chapter: string,
  content: string,
  type: 'courseware' | 'quiz'
): Promise<string> {
  await ensureDirectoryStructure();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // 生成文件名
  const typeLabel = type === 'courseware' ? '课件' : '测验';
  const safeChapter = chapter.replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `${dateStr}_${safeChapter}_${typeLabel}_${uuidv4().slice(0, 8)}.md`;

  // 构建路径: obsidian/Courses/大宝/数学/
  const targetDir = path.join(
    OBSIDIAN_DIR,
    'Courses',
    userName,
    subject
  );

  await fs.mkdir(targetDir, { recursive: true });
  const filePath = path.join(targetDir, fileName);

  // 生成 Frontmatter
  const frontmatter = `---
type: ${type === 'courseware' ? 'COURSEWARE' : 'MOCK_EXAM'}
subject: ${subject}
chapter: ${chapter}
owner: ${ownerId}
created: ${now.toISOString()}
tags: [${subject}, ${chapter}, ${type}]
---

# ${subject} - ${chapter} ${typeLabel}

${content}
`;

  await fs.writeFile(filePath, frontmatter, 'utf-8');

  return filePath;
}

/**
 * 读取 Markdown 文件内容
 * @param filePath - 文件路径
 * @returns 文件内容
 */
export async function readMarkdownFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error);
    throw new Error(`文件不存在或无法读取: ${filePath}`);
  }
}

/**
 * 元数据条目接口
 */
interface MetadataEntry {
  id: string;
  type: string;
  ownerId: string;
  userName: string;
  subject: string;
  chapter?: string;
  timestamp: number;
  mdPath?: string;
  imagePath?: string;
  filePath?: string; // 用于教材文件
  anythingLlmDocId?: string;
}

/**
 * 更新元数据索引
 * @param entry - 元数据条目
 */
export async function updateMetadataIndex(entry: MetadataEntry): Promise<void> {
  await ensureDirectoryStructure();

  let metadata: MetadataEntry[] = [];

  try {
    const content = await fs.readFile(METADATA_FILE, 'utf-8');
    metadata = JSON.parse(content);
  } catch (error) {
    console.error('读取元数据文件失败，创建新文件');
    metadata = [];
  }

  // 查找并更新或添加
  const existingIndex = metadata.findIndex(m => m.id === entry.id);
  if (existingIndex >= 0) {
    metadata[existingIndex] = entry;
  } else {
    metadata.push(entry);
  }

  // 按时间戳降序排序
  metadata.sort((a, b) => b.timestamp - a.timestamp);

  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

/**
 * 查询元数据
 * @param filters - 过滤条件
 * @returns 元数据列表
 */
export async function queryMetadata(filters: {
  ownerId?: string;
  subject?: string;
  type?: string;
  limit?: number;
}): Promise<MetadataEntry[]> {
  await ensureDirectoryStructure();

  try {
    const content = await fs.readFile(METADATA_FILE, 'utf-8');
    let metadata: MetadataEntry[] = JSON.parse(content);

    // 应用过滤条件
    if (filters.ownerId) {
      metadata = metadata.filter(m => m.ownerId === filters.ownerId || m.ownerId === 'shared');
    }
    if (filters.subject) {
      metadata = metadata.filter(m => m.subject === filters.subject);
    }
    if (filters.type) {
      metadata = metadata.filter(m => m.type === filters.type);
    }

    // 限制返回数量
    if (filters.limit) {
      metadata = metadata.slice(0, filters.limit);
    }

    return metadata;
  } catch (error) {
    console.error('查询元数据失败:', error);
    return [];
  }
}

/**
 * 获取单个元数据条目
 * @param id - ID
 * @returns 元数据条目或null
 */
export async function getMetadataById(id: string): Promise<MetadataEntry | null> {
  const metadata = await queryMetadata({});
  return metadata.find(m => m.id === id) || null;
}

/**
 * 删除元数据条目
 * @param id - ID
 */
export async function deleteMetadata(id: string): Promise<void> {
  await ensureDirectoryStructure();

  try {
    const content = await fs.readFile(METADATA_FILE, 'utf-8');
    let metadata: MetadataEntry[] = JSON.parse(content);

    metadata = metadata.filter(m => m.id !== id);

    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('删除元数据失败:', error);
  }
}
