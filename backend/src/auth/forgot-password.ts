import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();

interface ForgotPasswordRequest {
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

    const requestBody: ForgotPasswordRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.username) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    // Initiate forgot password flow with Cognito
    const forgotPasswordParams = {
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: requestBody.username,
    };

    const result = await cognito.forgotPassword(forgotPasswordParams).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password reset code sent',
        codeDeliveryDetails: result.CodeDeliveryDetails,
      }),
    };
  } catch (error: any) {
    console.error('Forgot password error:', error);

    // Handle specific Cognito errors
    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    if (error.code === 'InvalidParameterException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid username format' }),
      };
    }

    if (error.code === 'LimitExceededException') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
