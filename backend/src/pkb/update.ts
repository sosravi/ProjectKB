import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

interface UpdatePkbRequest {
  name?: string;
  description?: string;
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
    'Access-Control-Allow-Methods': 'PUT,OPTIONS',
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
    if (event.httpMethod !== 'PUT') {
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

    const requestBody: UpdatePkbRequest = JSON.parse(event.body);

    // Validate that at least one field is provided
    if (!requestBody.name && !requestBody.description) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one field (name or description) must be provided' }),
      };
    }

    // Validate name if provided
    if (requestBody.name !== undefined) {
      if (!requestBody.name.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name cannot be empty' }),
        };
      }
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
    }

    // Validate description if provided
    if (requestBody.description !== undefined) {
      if (!requestBody.description.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Description cannot be empty' }),
        };
      }
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

    // Prepare update expression and attribute values
    const updateExpressions: string[] = [];
    const expressionAttributeValues: any = {};
    const expressionAttributeNames: any = {};

    if (requestBody.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = requestBody.name.trim();
    }

    if (requestBody.description !== undefined) {
      updateExpressions.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = requestBody.description.trim();
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    // Update PKB in DynamoDB
    const updateParams = {
      TableName: process.env.PKB_TABLE!,
      Key: {
        pkbId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const updateResult = await dynamodb.update(updateParams).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'PKB updated successfully',
        pkb: updateResult.Attributes,
      }),
    };
  } catch (error: any) {
    console.error('Update PKB error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

