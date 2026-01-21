import { useState, useCallback } from 'react';
import { UploadProgress } from '../types';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export interface ChunkedUploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface UseChunkedUploadReturn {
  uploadProgress: UploadProgress | null;
  isUploading: boolean;
  uploadFile: (file: File, ownerId: string, endpoint: string) => Promise<ChunkedUploadResult>;
  resetProgress: () => void;
}

export const useChunkedUpload = (): UseChunkedUploadReturn => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(async (
    file: File,
    ownerId: string,
    endpoint: string
  ): Promise<ChunkedUploadResult> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    // 使用纯时间戳作为 fileId，避免中文文件名导致验证失败
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    let uploadedChunks = 0;

    setIsUploading(true);

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileId', fileId);
        formData.append('fileName', file.name);
        formData.append('ownerId', ownerId);

        // 指数退避重试机制 (1s, 2s, 3s)
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;

        while (!success && retryCount < maxRetries) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
              throw new Error(result.error || '上传失败');
            }

            success = true;
            uploadedChunks++;

            // 更新进度
            const loaded = Math.min(end, file.size);
            setUploadProgress({
              loaded,
              total: file.size,
              percentage: Math.round((loaded / file.size) * 100),
              chunkIndex,
              totalChunks,
            });

          } catch (error) {
            retryCount++;
            if (retryCount < maxRetries) {
              // 指数退避：1s, 2s, 3s
              await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
            } else {
              throw error;
            }
          }
        }
      }

      // 所有分片上传完成，请求合并
      const mergeResponse = await fetch(`${endpoint}?action=merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName: file.name, ownerId }),
      });

      if (!mergeResponse.ok) {
        throw new Error(`HTTP ${mergeResponse.status}`);
      }

      const mergeResult = await mergeResponse.json();

      return {
        success: true,
        filePath: mergeResult.filePath,
      };

    } catch (error: any) {
      console.error('分片上传失败:', error);
      return {
        success: false,
        error: error.message || '上传失败，请重试',
      };
    } finally {
      setIsUploading(false);
    }
  }, []);

  const resetProgress = useCallback(() => {
    setUploadProgress(null);
  }, []);

  return {
    uploadProgress,
    isUploading,
    uploadFile,
    resetProgress,
  };
};
