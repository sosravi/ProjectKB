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

    // Extract user from JWT token (this would be done by API Gateway authorizer in real implementation)
    const user: AuthenticatedUser = JSON.parse(event.requestContext.authorizer?.user || '{}');
    if (!user.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Extract search query from query parameters
    const query = event.queryStringParameters?.q;
    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Search query is required' }),
      };
    }

    // Validate query length
    if (query.trim().length < 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Search query must be at least 3 characters' }),
      };
    }

    // Parse limit parameter
    const limit = event.queryStringParameters?.limit ? 
      parseInt(event.queryStringParameters.limit, 10) : 20;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Limit must be between 1 and 100' }),
      };
    }

    // Search PKBs using scan with filter expression
    // Note: In production, consider using Elasticsearch or OpenSearch for better search performance
    const scanParams = {
      TableName: process.env.PKB_TABLE!,
      FilterExpression: 'userId = :userId AND (contains(#name, :query) OR contains(#description, :query))',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#description': 'description',
      },
      ExpressionAttributeValues: {
        ':userId': user.userId,
        ':query': query.trim(),
      },
      Limit: limit,
    };

    const result = await dynamodb.scan(scanParams).promise();

    // Get content count for each PKB
    const pkbsWithContentCount = await Promise.all(
      (result.Items || []).map(async (pkb) => {
        try {
          const contentCountResult = await dynamodb.query({
            TableName: process.env.CONTENT_TABLE!,
            KeyConditionExpression: 'pkbId = :pkbId',
            ExpressionAttributeValues: {
              ':pkbId': pkb.pkbId,
            },
            Select: 'COUNT',
          }).promise();

          return {
            ...pkb,
            contentCount: contentCountResult.Count || 0,
          };
        } catch (error) {
          console.error(`Failed to get content count for PKB ${pkb.pkbId}:`, error);
          return {
            ...pkb,
            contentCount: 0,
          };
        }
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pkbs: pkbsWithContentCount,
        query: query.trim(),
        totalFound: pkbsWithContentCount.length,
      }),
    };
  } catch (error: any) {
    console.error('Search PKBs error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};


