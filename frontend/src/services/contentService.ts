import { Auth } from 'aws-amplify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://gi0wwv0vo5.execute-api.us-east-1.amazonaws.com/prod';

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

export interface PresignedUrlResponse {
  presignedUrl: string;
  s3Key: string;
  contentId: string;
}

export interface UploadConfirmRequest {
  contentId: string;
  s3Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
}

class ContentService {
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

  async uploadFile(
    pkbId: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<Content> {
    // Step 1: Get presigned URL
    const presignedData = await this.makeRequest<PresignedUrlResponse>('/content/presigned-url', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    // Step 2: Upload file to S3 using presigned URL
    const uploadResponse = await fetch(presignedData.presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to S3');
    }

    // Step 3: Confirm upload
    const confirmData = await this.makeRequest<{ content: Content }>('/content/confirm-upload', {
      method: 'POST',
      body: JSON.stringify({
        contentId: presignedData.contentId,
        s3Key: presignedData.s3Key,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    return confirmData.content;
  }

  async getContent(pkbId: string): Promise<{ content: Content[] }> {
    return this.makeRequest<{ content: Content[] }>(`/content/${pkbId}`, {
      method: 'GET',
    });
  }

  async deleteContent(contentId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/content/${contentId}`, {
      method: 'DELETE',
    });
  }

  async getDownloadUrl(contentId: string): Promise<DownloadUrlResponse> {
    return this.makeRequest<DownloadUrlResponse>(`/content/${contentId}/download`, {
      method: 'GET',
    });
  }
}

export const contentService = new ContentService();

