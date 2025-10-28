import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB, S3 } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
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
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Extract content ID from path parameters
    const contentId = event.pathParameters?.contentId;
    if (!contentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content ID is required' }),
      };
    }

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

    // Get the content to check ownership and get S3 key
    const getParams = {
      TableName: process.env.CONTENT_TABLE!,
      Key: {
        id: contentId, // Use id as the DynamoDB hash key
      },
    };

    const getResult = await dynamodb.get(getParams).promise();

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Content not found' }),
      };
    }

    // TODO: Check if user owns this content (JWT verification needed)

    // Generate presigned URL for download
    const presignedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET!,
      Key: getResult.Item.s3Key,
      Expires: 3600, // 1 hour
      ResponseContentDisposition: `attachment; filename="${getResult.Item.fileName}"`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        downloadUrl: presignedUrl,
        fileName: getResult.Item.fileName,
        expiresIn: 3600,
      }),
    };
  } catch (error: any) {
    console.error('Get download URL error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};


