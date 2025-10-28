import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

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

    // Query content for this PKB
    const contentParams = {
      TableName: process.env.CONTENT_TABLE!,
      IndexName: 'pkbId-uploadedAt-index', // GSI on pkbId
      KeyConditionExpression: 'pkbId = :pkbId',
      ExpressionAttributeValues: {
        ':pkbId': pkbId,
      },
      ScanIndexForward: false, // Sort by uploadedAt descending
    };

    const result = await dynamodb.query(contentParams).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: result.Items || [],
      }),
    };
  } catch (error: any) {
    console.error('List content error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};


