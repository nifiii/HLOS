import { analyzeMetadataWithDoubao, convertToMarkdownWithDoubao } from './doubaoService.js';
import { analyzeMetadataWithOpenAI, convertToMarkdownWithOpenAI } from './openaiService.js';
import { ChapterNode } from '../types.js';

export type LLMProvider = 'doubao' | 'openai';

// 定义统一的返回接口
export interface LLMMetadataResult {
  title: string;
  author?: string;
  subject: string;
  category: string;
  grade: string;
  tags: string[];
  publisher?: string;
  publishDate?: string;
  tableOfContents: ChapterNode[];
}

// 获取当前配置的 Provider，默认为 doubao
const getCurrentProvider = (): LLMProvider => {
  return (process.env.LLM_PROVIDER as LLMProvider) || 'doubao';
};

/**
 * 统一的元数据分析入口
 */
export async function analyzeMetadata(
  text: string,
  fileName: string,
  provider?: LLMProvider
): Promise<LLMMetadataResult> {
  const useProvider = provider || getCurrentProvider();
  
  console.log(`正在使用 ${useProvider} 服务分析元数据...`);

  if (useProvider === 'openai') {
    return analyzeMetadataWithOpenAI(text, fileName);
  } else {
    return analyzeMetadataWithDoubao(text, fileName);
  }
}

/**
 * 统一的 Markdown 转换入口
 */
export async function convertToMarkdown(
  text: string,
  provider?: LLMProvider
): Promise<string> {
  const useProvider = provider || getCurrentProvider();

  console.log(`正在使用 ${useProvider} 服务转换 Markdown...`);

  if (useProvider === 'openai') {
    return convertToMarkdownWithOpenAI(text);
  } else {
    return convertToMarkdownWithDoubao(text);
  }
}
