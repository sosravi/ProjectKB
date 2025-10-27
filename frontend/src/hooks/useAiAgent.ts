import { useState, useCallback } from 'react';
import { useAuth } from './useAuth.ts';
import { aiService, AiQueryResponse, SemanticSearchResponse, SuggestionsResponse, ContentAnalysis } from '../services/aiService.ts';

export const useAiAgent = (pkbId: string) => {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryContent = useCallback(async (query: string): Promise<AiQueryResponse> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.queryContent(pkbId, query);
      return response;
    } catch (err: any) {
      console.error('Failed to query content:', err);
      setError(err.message || 'Failed to query content');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const semanticSearch = useCallback(async (
    query: string, 
    limit?: number
  ): Promise<SemanticSearchResponse> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.semanticSearch(pkbId, query, limit);
      return response;
    } catch (err: any) {
      console.error('Failed to perform semantic search:', err);
      setError(err.message || 'Failed to perform semantic search');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const generateSuggestions = useCallback(async (contentId: string): Promise<SuggestionsResponse> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.generateSuggestions(pkbId, contentId);
      return response;
    } catch (err: any) {
      console.error('Failed to generate suggestions:', err);
      setError(err.message || 'Failed to generate suggestions');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  const analyzeContent = useCallback(async (contentId: string): Promise<ContentAnalysis> => {
    if (!isAuthenticated || !user || !pkbId) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.analyzeContent(pkbId, contentId);
      return response;
    } catch (err: any) {
      console.error('Failed to analyze content:', err);
      setError(err.message || 'Failed to analyze content');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbId]);

  return {
    isLoading,
    error,
    queryContent,
    semanticSearch,
    generateSuggestions,
    analyzeContent,
  };
};
