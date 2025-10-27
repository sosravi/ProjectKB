import { Auth } from 'aws-amplify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://gi0wwv0vo5.execute-api.us-east-1.amazonaws.com/prod';

export interface ImageAnalysis {
  description: string;
  objects: string[];
  text: string;
  confidence: number;
  suggestions: string[];
}

export interface AudioTranscription {
  transcript: string;
  confidence: number;
  speakers: Array<{
    speaker: string;
    text: string;
  }>;
  duration: number;
  language: string;
}

export interface MultimediaQueryResponse {
  response: string;
  sources: string[];
  multimediaTypes: string[];
}

export interface VectorSearchResult {
  contentId: string;
  fileName: string;
  similarityScore: number;
  snippet: string;
  embedding: number[];
}

export interface VectorSearchResponse {
  results: VectorSearchResult[];
}

export interface EmbeddingsResponse {
  embeddings: number[];
  model: string;
}

class MultimediaAiService {
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

  async analyzeImage(pkbId: string, contentId: string): Promise<ImageAnalysis> {
    return this.makeRequest<ImageAnalysis>('/ai/analyze-image', {
      method: 'POST',
      body: JSON.stringify({
        contentId,
        pkbId,
      }),
    });
  }

  async transcribeAudio(pkbId: string, contentId: string): Promise<AudioTranscription> {
    return this.makeRequest<AudioTranscription>('/ai/transcribe-audio', {
      method: 'POST',
      body: JSON.stringify({
        contentId,
        pkbId,
      }),
    });
  }

  async queryMultimedia(pkbId: string, query: string): Promise<MultimediaQueryResponse> {
    return this.makeRequest<MultimediaQueryResponse>('/ai/query-multimedia', {
      method: 'POST',
      body: JSON.stringify({
        query,
        pkbId,
      }),
    });
  }

  async vectorSearch(pkbId: string, query: string, limit?: number): Promise<VectorSearchResponse> {
    return this.makeRequest<VectorSearchResponse>('/ai/vector-search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        pkbId,
        limit,
      }),
    });
  }

  async generateEmbeddings(pkbId: string, contentId: string): Promise<EmbeddingsResponse> {
    return this.makeRequest<EmbeddingsResponse>('/ai/generate-embeddings', {
      method: 'POST',
      body: JSON.stringify({
        contentId,
        pkbId,
      }),
    });
  }
}

export const multimediaAiService = new MultimediaAiService();

