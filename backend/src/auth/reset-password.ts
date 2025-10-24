import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();

interface ResetPasswordRequest {
  username: string;
  code: string;
  newPassword: string;
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

    const requestBody: ResetPasswordRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.username || !requestBody.code || !requestBody.newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username, code, and new password are required' }),
      };
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(requestBody.newPassword)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character' 
        }),
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

    // Confirm forgot password with Cognito
    const confirmForgotPasswordParams = {
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: requestBody.username,
      ConfirmationCode: requestBody.code,
      Password: requestBody.newPassword,
    };

    await cognito.confirmForgotPassword(confirmForgotPasswordParams).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password reset successfully',
      }),
    };
  } catch (error: any) {
    console.error('Reset password error:', error);

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

    if (error.code === 'InvalidPasswordException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password does not meet requirements' }),
      };
    }

    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
