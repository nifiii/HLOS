import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || '/opt/hl-os/data';
const DB_PATH = path.join(DATA_DIR, 'hlos.db');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

/**
 * 初始化数据库表
 */
export function initDatabase() {
  console.log(`[Database] 正在初始化数据库: ${DB_PATH}`);
  
  // 书籍表
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      subject TEXT,
      category TEXT,
      grade TEXT,
      publisher TEXT,
      publishDate TEXT,
      tags TEXT, -- 存储为 JSON 字符串
      ownerId TEXT NOT NULL,
      userName TEXT,
      filePath TEXT,
      mdPath TEXT,
      coverPath TEXT,
      status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
      timestamp INTEGER
    )
  `);

  // 扫描项表 (后续迁移使用)
  db.exec(`
    CREATE TABLE IF NOT EXISTS scanned_items (
      id TEXT PRIMARY KEY,
      type TEXT,
      subject TEXT,
      chapter TEXT,
      ownerId TEXT,
      userName TEXT,
      mdPath TEXT,
      imagePath TEXT,
      timestamp INTEGER
    )
  `);

  console.log('[Database] 数据库初始化完成');
}

export default db;
