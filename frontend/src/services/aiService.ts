import { Auth } from 'aws-amplify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.projectkb.com';

export interface AiQueryResponse {
  response: string;
  sources: string[];
}

export interface SemanticSearchResult {
  contentId: string;
  fileName: string;
  relevanceScore: number;
  snippet: string;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
}

export interface ContentSuggestion {
  id: string;
  type: 'related_content' | 'improvement' | 'action_item';
  title: string;
  description: string;
  confidence: number;
}

export interface SuggestionsResponse {
  suggestions: ContentSuggestion[];
}

export interface ContentAnalysis {
  summary: string;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
}

class AiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();
      
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    } catch (error) {
      console.error('Failed to get auth token:', error);
      throw new Error('Authentication required');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async queryContent(pkbId: string, query: string): Promise<AiQueryResponse> {
    return this.makeRequest<AiQueryResponse>('/ai/query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        pkbId,
      }),
    });
  }

  async semanticSearch(pkbId: string, query: string, limit?: number): Promise<SemanticSearchResponse> {
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('pkbId', pkbId);
    if (limit) params.append('limit', limit.toString());
    
    return this.makeRequest<SemanticSearchResponse>(`/ai/semantic-search?${params.toString()}`, {
      method: 'POST',
    });
  }

  async generateSuggestions(pkbId: string, contentId: string): Promise<SuggestionsResponse> {
    return this.makeRequest<SuggestionsResponse>('/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify({
        contentId,
        pkbId,
      }),
    });
  }

  async analyzeContent(pkbId: string, contentId: string): Promise<ContentAnalysis> {
    return this.makeRequest<ContentAnalysis>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({
        contentId,
        pkbId,
      }),
    });
  }
}

export const aiService = new AiService();
