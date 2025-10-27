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

    // Get PKB from DynamoDB
    const getParams = {
      TableName: process.env.PKB_TABLE!,
      Key: {
        pkbId,
      },
    };

    const result = await dynamodb.get(getParams).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'PKB not found' }),
      };
    }

    // Check if user owns this PKB
    if (result.Item.userId !== user.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' }),
      };
    }

    // Get content count for the PKB
    let contentCount = 0;
    try {
      const contentCountResult = await dynamodb.query({
        TableName: process.env.CONTENT_TABLE!,
        KeyConditionExpression: 'pkbId = :pkbId',
        ExpressionAttributeValues: {
          ':pkbId': pkbId,
        },
        Select: 'COUNT',
      }).promise();
      contentCount = contentCountResult.Count || 0;
    } catch (error) {
      console.error(`Failed to get content count for PKB ${pkbId}:`, error);
    }

    const pkbWithContentCount = {
      ...result.Item,
      contentCount,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pkb: pkbWithContentCount,
      }),
    };
  } catch (error: any) {
    console.error('Get PKB error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

