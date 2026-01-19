import { StructuredMetaData } from "../types";

/**
 * 统一错误处理
 */
const handleApiError = (error: any) => {
  console.error("API Error Detail:", error);
  throw error;
};

/**
 * 图像分析 - 通过 Serverless Function 代理
 * 环境自适应: 本地开发使用直连,生产环境使用 Vercel Function
 */
export const analyzeImage = async (base64Image: string): Promise<{ text: string; meta: StructuredMetaData }> => {
  try {
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base64Image })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '分析失败');
    }

    return result.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * 生成课件 - 通过 Serverless Function 代理
 */
export const generateCourseware = async (bookTitle: string, chapter: string, studentName: string): Promise<string> => {
  try {
    const response = await fetch('/api/generate-courseware', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bookTitle, chapter, studentName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '课件生成失败');
    }

    return result.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * 生成试卷 - 通过 Serverless Function 代理
 */
export const generateAssessment = async (request: any, contextItems: string[], studentName: string): Promise<string> => {
  try {
    const response = await fetch('/api/generate-assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ request, contextItems, studentName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '试卷生成失败');
    }

    return result.data;
  } catch (error) {
    return handleApiError(error);
  }
};
