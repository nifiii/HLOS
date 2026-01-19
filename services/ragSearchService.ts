/**
 * AnythingLLM RAG 搜索服务
 * 用于从向量化的图书内容和错题中检索相关信息
 */

export interface RAGSearchResult {
  content: string;
  metadata: {
    source: string; // 来源（图书/错题）
    title: string;
    relevanceScore: number;
  };
}

export interface RAGSearchParams {
  query: string;
  bookIds?: string[]; // 限定搜索的图书范围
  topK?: number; // 返回的最相关结果数量
}

/**
 * 搜索图书内容（基于向量相似度）
 */
export async function searchBookContent(params: RAGSearchParams): Promise<RAGSearchResult[]> {
  try {
    const response = await fetch('/api/anythingllm/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.query,
        bookIds: params.bookIds || [],
        topK: params.topK || 5,
        searchType: 'book',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '搜索失败');
    }

    return result.data.results || [];
  } catch (error) {
    console.error('RAG 搜索失败:', error);
    throw error;
  }
}

/**
 * 搜索历史错题（基于向量相似度）
 */
export async function searchWrongProblems(params: RAGSearchParams): Promise<RAGSearchResult[]> {
  try {
    const response = await fetch('/api/anythingllm/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.query,
        topK: params.topK || 5,
        searchType: 'wrong_problem',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '搜索失败');
    }

    return result.data.results || [];
  } catch (error) {
    console.error('错题搜索失败:', error);
    throw error;
  }
}

/**
 * 综合搜索（同时搜索图书和错题）
 */
export async function searchAll(params: RAGSearchParams): Promise<{
  bookResults: RAGSearchResult[];
  wrongProblemResults: RAGSearchResult[];
}> {
  try {
    const [bookResults, wrongProblemResults] = await Promise.all([
      searchBookContent(params),
      searchWrongProblems(params),
    ]);

    return {
      bookResults,
      wrongProblemResults,
    };
  } catch (error) {
    console.error('综合搜索失败:', error);
    throw error;
  }
}

/**
 * 索引图书到 AnythingLLM
 */
export async function indexBookToAnythingLLM(
  bookId: string,
  bookTitle: string,
  content: string
): Promise<{ success: boolean; docId?: string }> {
  try {
    const response = await fetch('/api/anythingllm/index-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        bookTitle,
        content,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '索引失败');
    }

    return {
      success: true,
      docId: result.data?.docId,
    };
  } catch (error) {
    console.error('索引图书失败:', error);
    throw error;
  }
}

/**
 * 索引错题到 AnythingLLM
 */
export async function indexScannedItemToAnythingLLM(
  itemId: string,
  content: string,
  metadata: any
): Promise<{ success: boolean; docId?: string }> {
  try {
    const response = await fetch('/api/anythingllm/index-scanned-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId,
        content,
        metadata,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '索引失败');
    }

    return {
      success: true,
      docId: result.data?.docId,
    };
  } catch (error) {
    console.error('索引错题失败:', error);
    throw error;
  }
}
