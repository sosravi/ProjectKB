import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new DynamoDB.DocumentClient();

interface CreatePkbRequest {
  name: string;
  description: string;
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

    const requestBody: CreatePkbRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.name || !requestBody.description) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name and description are required' }),
      };
    }

    // Validate name length
    if (requestBody.name.trim().length < 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name must be at least 3 characters' }),
      };
    }

    if (requestBody.name.trim().length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name must be less than 100 characters' }),
      };
    }

    // Validate description length
    if (requestBody.description.trim().length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Description must be at least 10 characters' }),
      };
    }

    if (requestBody.description.trim().length > 500) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Description must be less than 500 characters' }),
      };
    }

    // Generate PKB ID
    const pkbId = uuidv4();
    const id = pkbId; // Use pkbId as the DynamoDB id
    const now = new Date().toISOString();

    // Create PKB item
    const pkbItem = {
      id,
      userId: user.userId,
      pkbId, // Keep for backward compatibility
      name: requestBody.name.trim(),
      description: requestBody.description.trim(),
      createdAt: now,
      updatedAt: now,
      contentCount: 0,
    };

    // Save to DynamoDB
    const putParams = {
      TableName: process.env.PKB_TABLE!,
      Item: pkbItem,
      ConditionExpression: 'attribute_not_exists(id)', // Prevent overwrites
    };

    await dynamodb.put(putParams).promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'PKB created successfully',
        pkb: pkbItem,
      }),
    };
  } catch (error: any) {
    console.error('Create PKB error:', error);

    // Handle DynamoDB conditional check failed
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'PKB with this ID already exists' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};


