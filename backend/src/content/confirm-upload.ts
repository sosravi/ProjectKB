import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

interface ConfirmUploadRequest {
  contentId: string;
  s3Key: string;
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
    const user: AuthenticatedUser = JSON.parse(event.requestContext.authorizer?.user || '{}');
    if (!user.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const requestBody: ConfirmUploadRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.contentId || !requestBody.s3Key || !requestBody.fileName || 
        !requestBody.fileType || !requestBody.fileSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'All fields are required' }),
      };
    }

    // Extract PKB ID from S3 key (format: uploads/{userId}/{contentId}/{fileName})
    const s3KeyParts = requestBody.s3Key.split('/');
    if (s3KeyParts.length < 4 || s3KeyParts[0] !== 'uploads' || s3KeyParts[1] !== user.userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid S3 key format' }),
      };
    }

    // For now, we'll use a default PKB ID. In a real implementation, this would come from the request
    const pkbId = 'default-pkb'; // This should be passed in the request body

    const now = new Date().toISOString();

    // Create content item
    const contentItem = {
      contentId: requestBody.contentId,
      pkbId,
      userId: user.userId,
      fileName: requestBody.fileName,
      fileType: requestBody.fileType,
      fileSize: requestBody.fileSize,
      s3Key: requestBody.s3Key,
      uploadedAt: now,
      uploadedBy: user.username,
    };

    // Save to DynamoDB
    const putParams = {
      TableName: process.env.CONTENT_TABLE!,
      Item: contentItem,
      ConditionExpression: 'attribute_not_exists(contentId)', // Prevent overwrites
    };

    await dynamodb.put(putParams).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Upload confirmed successfully',
        content: contentItem,
      }),
    };
  } catch (error: any) {
    console.error('Confirm upload error:', error);

    // Handle DynamoDB conditional check failed
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Content with this ID already exists' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
