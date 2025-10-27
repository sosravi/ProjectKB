import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();

interface VerifyRequest {
  username: string;
  code: string;
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

    const requestBody: VerifyRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.username || !requestBody.code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username and verification code are required' }),
      };
    }

    // Validate code format (6 digits)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(requestBody.code)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Verification code must be 6 digits' }),
      };
    }

    // Confirm sign up with Cognito
    const confirmParams = {
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: requestBody.username,
      ConfirmationCode: requestBody.code,
    };

    await cognito.confirmSignUp(confirmParams).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Email verified successfully',
      }),
    };
  } catch (error: any) {
    console.error('Verification error:', error);

    // Handle specific Cognito errors
    if (error.code === 'CodeMismatchException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid verification code' }),
      };
    }

    if (error.code === 'ExpiredCodeException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Verification code has expired' }),
      };
    }

    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    if (error.code === 'NotAuthorizedException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User is already confirmed' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

