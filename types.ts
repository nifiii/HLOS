
// Data types for the learning system

export enum DocType {
  TEXTBOOK = 'textbook', 
  NOTE = 'note',         
  WRONG_PROBLEM = 'wrong_problem', 
  EXAM_PAPER = 'exam_paper', 
  COURSEWARE = '学习完成的课件', 
  KNOWLEDGE_CARD = '知识卡片', 
  MOCK_EXAM = '模拟考试',
  HOMEWORK = '作业',
  TUTOR_SESSION = '辅导记录',
  UNKNOWN = 'unknown'
}

export enum KnowledgeStatus {
  MASTERED = '已经掌握的知识',
  UNMASTERED = '未掌握的知识',
  STRENGTHEN = '需加强的知识点'
}

export enum ProcessingStatus {
  IDLE = 'idle',
  SCANNING = 'scanning',
  PROCESSED = 'processed',
  ERROR = 'error',
  INDEXING = 'indexing', 
  ARCHIVED = 'archived'
}

export enum ProblemStatus {
  CORRECT = 'correct',
  WRONG = 'wrong',
  CORRECTED = 'corrected' // 订正过的
}

export interface ProblemUnit {
  id: string;
  questionNumber: string;
  content: string;
  studentAnswer: string;
  teacherComment: string;
  status: ProblemStatus;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  grade: string;
}

export interface EBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  subject: string;
  category: string; 
  chapters: string[];
  isPublic: boolean;
  indexedAt?: number;
}

export interface StructuredMetaData {
  type: DocType;
  subject: string;
  chapter_hint?: string;
  knowledge_status?: KnowledgeStatus;
  frontmatter?: string; // Obsidian 元数据
  problems?: ProblemUnit[]; // 解析出的题目单元
}

export interface ScannedItem {
  id: string;
  ownerId: string; 
  timestamp: number;
  imageUrl: string;
  rawMarkdown: string;
  meta: StructuredMetaData;
  status: ProcessingStatus;
}

export interface ExamRequest {
  subject: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'unit' | 'midterm' | 'final' | 'mock';
}

export interface ExamPaper {
  id: string;
  ownerId: string;
  title: string;
  content: string; 
  createdAt: number;
  subject: string;
}
