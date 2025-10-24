import { Auth } from 'aws-amplify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.projectkb.com';

export interface Pkb {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  contentCount?: number;
}

export interface CreatePkbData {
  name: string;
  description: string;
}

export interface UpdatePkbData {
  name?: string;
  description?: string;
}

export interface PkbListResponse {
  pkbs: Pkb[];
  lastEvaluatedKey?: string;
}

export interface PkbSearchResponse {
  pkbs: Pkb[];
}

class PkbService {
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

  async createPkb(pkbData: CreatePkbData): Promise<Pkb> {
    return this.makeRequest<Pkb>('/pkb', {
      method: 'POST',
      body: JSON.stringify(pkbData),
    });
  }

  async getPkbs(limit?: number, lastEvaluatedKey?: string): Promise<PkbListResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/pkb?${queryString}` : '/pkb';
    
    return this.makeRequest<PkbListResponse>(endpoint, {
      method: 'GET',
    });
  }

  async getPkbById(pkbId: string): Promise<{ pkb: Pkb }> {
    return this.makeRequest<{ pkb: Pkb }>(`/pkb/${pkbId}`, {
      method: 'GET',
    });
  }

  async updatePkb(pkbId: string, updateData: UpdatePkbData): Promise<Pkb> {
    return this.makeRequest<Pkb>(`/pkb/${pkbId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deletePkb(pkbId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/pkb/${pkbId}`, {
      method: 'DELETE',
    });
  }

  async searchPkbs(query: string, limit?: number): Promise<PkbSearchResponse> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit) params.append('limit', limit.toString());
    
    return this.makeRequest<PkbSearchResponse>(`/pkb/search?${params.toString()}`, {
      method: 'GET',
    });
  }
}

export const pkbService = new PkbService();
