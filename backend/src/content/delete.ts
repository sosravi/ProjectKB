import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB, S3 } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

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
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
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
    if (event.httpMethod !== 'DELETE') {
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

    // Extract user from JWT token (this would be done by API Gateway authorizer in real implementation)
    const user: AuthenticatedUser = JSON.parse(event.requestContext.authorizer?.user || '{}');
    if (!user.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // First, get the content to check ownership
    const getParams = {
      TableName: process.env.CONTENT_TABLE!,
      Key: {
        contentId,
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

    // Check if user owns this content
    if (getResult.Item.userId !== user.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' }),
      };
    }

    // Delete file from S3
    const s3DeleteParams = {
      Bucket: process.env.S3_BUCKET!,
      Key: getResult.Item.s3Key,
    };

    try {
      await s3.deleteObject(s3DeleteParams).promise();
    } catch (s3Error) {
      console.error('Failed to delete file from S3:', s3Error);
      // Continue with DynamoDB deletion even if S3 deletion fails
    }

    // Delete content record from DynamoDB
    const deleteParams = {
      TableName: process.env.CONTENT_TABLE!,
      Key: {
        contentId,
      },
    };

    await dynamodb.delete(deleteParams).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Content deleted successfully',
      }),
    };
  } catch (error: any) {
    console.error('Delete content error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
