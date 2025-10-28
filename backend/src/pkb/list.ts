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
    // TODO: Verify JWT token with Cognito (simplified for now)
    // For now, we'll accept any token and use a mock user - this should be replaced with actual JWT verification
    console.log('Auth token received:', token.substring(0, 20) + '...');
    const user: AuthenticatedUser = {
      userId: 'temp-user-id',
      username: 'temp-user'
    };

    // Parse query parameters
    const limit = event.queryStringParameters?.limit ? 
      parseInt(event.queryStringParameters.limit, 10) : 20;
    const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Limit must be between 1 and 100' }),
      };
    }

    // Query PKBs for the user
    const queryParams: any = {
      TableName: process.env.PKB_TABLE!,
      IndexName: 'userId-createdAt-index', // GSI on userId
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': user.userId,
      },
      Limit: limit,
      ScanIndexForward: false, // Sort by createdAt descending
    };

    // Add pagination if lastEvaluatedKey is provided
    if (lastEvaluatedKey) {
      try {
        queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid lastEvaluatedKey format' }),
        };
      }
    }

    const result = await dynamodb.query(queryParams).promise();

    // Get content count for each PKB
    const pkbsWithContentCount = await Promise.all(
      (result.Items || []).map(async (pkb) => {
        try {
          const contentCountResult = await dynamodb.query({
            TableName: process.env.CONTENT_TABLE!,
            IndexName: 'pkbId-uploadedAt-index', // GSI on pkbId
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
        lastEvaluatedKey: result.LastEvaluatedKey ? 
          encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : undefined,
      }),
    };
  } catch (error: any) {
    console.error('List PKBs error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};


