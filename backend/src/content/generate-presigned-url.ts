import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3();

interface GeneratePresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface AuthenticatedUser {
  userId: string;
  username: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    // Extract user from JWT token (this would be done by API Gateway authorizer in real implementation)
    // Extract user from JWT token in Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - No valid token' }),
      };
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Auth token received:', token.substring(0, 20) + '...');
    const user: AuthenticatedUser = {
      userId: 'temp-user-id',
      username: 'temp-user'
    };

    const requestBody: GeneratePresignedUrlRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.fileName || !requestBody.fileType || !requestBody.fileSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'fileName, fileType, and fileSize are required' }),
      };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'audio/mpeg',
      'audio/wav',
    ];

    if (!allowedTypes.includes(requestBody.fileType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File type not supported' }),
      };
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (requestBody.fileSize > maxSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File size exceeds limit (100MB)' }),
      };
    }

    // Generate unique content ID and S3 key
    const contentId = uuidv4();
    const s3Key = `uploads/${user.userId}/${contentId}/${requestBody.fileName}`;

    // Generate presigned URL for PUT operation
    const presignedUrl = s3.getSignedUrl('putObject', {
      Bucket: process.env.S3_BUCKET!,
      Key: s3Key,
      ContentType: requestBody.fileType,
      Expires: 300, // 5 minutes
      Metadata: {
        'original-filename': requestBody.fileName,
        'content-id': contentId,
        'user-id': user.userId,
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        presignedUrl,
        s3Key,
        contentId,
        expiresIn: 300,
      }),
    };
  } catch (error: any) {
    console.error('Generate presigned URL error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};


