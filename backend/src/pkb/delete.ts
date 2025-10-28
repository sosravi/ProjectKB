import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

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

    // Extract PKB ID from path parameters
    const pkbId = event.pathParameters?.pkbId;
    if (!pkbId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'PKB ID is required' }),
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

    // First, get the existing PKB to check ownership
    const getParams = {
      TableName: process.env.PKB_TABLE!,
      Key: {
        pkbId,
      },
    };

    const getResult = await dynamodb.get(getParams).promise();

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'PKB not found' }),
      };
    }

    // Check if user owns this PKB
    if (getResult.Item.userId !== user.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' }),
      };
    }

    // Get all content items for this PKB to delete them
    const contentQueryParams = {
      TableName: process.env.CONTENT_TABLE!,
      IndexName: 'pkbId-uploadedAt-index', // GSI on pkbId
      KeyConditionExpression: 'pkbId = :pkbId',
      ExpressionAttributeValues: {
        ':pkbId': pkbId,
      },
    };

    const contentResult = await dynamodb.query(contentQueryParams).promise();
    const contentItems = contentResult.Items || [];

    // Delete all content items
    if (contentItems.length > 0) {
      const deleteContentPromises = contentItems.map(async (item) => {
        const deleteParams = {
          TableName: process.env.CONTENT_TABLE!,
          Key: {
            pkbId: item.pkbId,
            contentId: item.contentId,
          },
        };
        return dynamodb.delete(deleteParams).promise();
      });

      await Promise.all(deleteContentPromises);
    }

    // Delete the PKB
    const deletePkbParams = {
      TableName: process.env.PKB_TABLE!,
      Key: {
        pkbId,
      },
    };

    await dynamodb.delete(deletePkbParams).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'PKB deleted successfully',
        deletedContentCount: contentItems.length,
      }),
    };
  } catch (error: any) {
    console.error('Delete PKB error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};


