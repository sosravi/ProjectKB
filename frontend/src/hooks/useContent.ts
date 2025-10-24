import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { contentService } from '../services/contentService';

export interface Content {
  id: string;
  pkbId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
}

export const useContent = (pkbId: string) => {
  const { isAuthenticated, user } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    if (!isAuthenticated || !user || !pkbId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await contentService.getContent(pkbId);
      setContent(data.content || []);
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setError(err.message || 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const uploadFile = useCallback(async (
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<Content> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const uploadedContent = await contentService.uploadFile(pkbId, file, onProgress);
      setContent(prev => [uploadedContent, ...prev]);
      return uploadedContent;
    } catch (err: any) {
      console.error('Failed to upload file:', err);
      setError(err.message || 'Failed to upload file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const deleteContent = useCallback(async (contentId: string): Promise<void> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      await contentService.deleteContent(contentId);
      setContent(prev => prev.filter(c => c.id !== contentId));
    } catch (err: any) {
      console.error('Failed to delete content:', err);
      setError(err.message || 'Failed to delete content');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const getDownloadUrl = useCallback(async (contentId: string): Promise<string> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      const data = await contentService.getDownloadUrl(contentId);
      return data.downloadUrl;
    } catch (err: any) {
      console.error('Failed to get download URL:', err);
      throw err;
    }
  }, [isAuthenticated, user]);

  const refreshContent = useCallback(() => {
    loadContent();
  }, [loadContent]);

  // Load content when component mounts or dependencies change
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return {
    content,
    isLoading,
    error,
    uploadFile,
    deleteContent,
    getDownloadUrl,
    refreshContent,
  };
};
