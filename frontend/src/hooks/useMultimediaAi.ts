import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  multimediaAiService, 
  ImageAnalysis, 
  AudioTranscription, 
  MultimediaQueryResponse, 
  VectorSearchResponse, 
  EmbeddingsResponse 
} from '../services/multimediaAiService';

export const useMultimediaAi = (pkbId: string) => {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(async (contentId: string): Promise<ImageAnalysis> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await multimediaAiService.analyzeImage(pkbId, contentId);
      return response;
    } catch (err: any) {
      console.error('Failed to analyze image:', err);
      setError(err.message || 'Failed to analyze image');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const transcribeAudio = useCallback(async (contentId: string): Promise<AudioTranscription> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await multimediaAiService.transcribeAudio(pkbId, contentId);
      return response;
    } catch (err: any) {
      console.error('Failed to transcribe audio:', err);
      setError(err.message || 'Failed to transcribe audio');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const queryMultimedia = useCallback(async (query: string): Promise<MultimediaQueryResponse> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await multimediaAiService.queryMultimedia(pkbId, query);
      return response;
    } catch (err: any) {
      console.error('Failed to query multimedia:', err);
      setError(err.message || 'Failed to query multimedia');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const vectorSearch = useCallback(async (
    query: string, 
    limit?: number
  ): Promise<VectorSearchResponse> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await multimediaAiService.vectorSearch(pkbId, query, limit);
      return response;
    } catch (err: any) {
      console.error('Failed to perform vector search:', err);
      setError(err.message || 'Failed to perform vector search');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const generateEmbeddings = useCallback(async (contentId: string): Promise<EmbeddingsResponse> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await multimediaAiService.generateEmbeddings(pkbId, contentId);
      return response;
    } catch (err: any) {
      console.error('Failed to generate embeddings:', err);
      setError(err.message || 'Failed to generate embeddings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  return {
    isLoading,
    error,
    analyzeImage,
    transcribeAudio,
    queryMultimedia,
    vectorSearch,
    generateEmbeddings,
  };
};
