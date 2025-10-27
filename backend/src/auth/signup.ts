import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();

interface SignupRequest {
  username: string;
  password: string;
  email: string;
  givenName: string;
  familyName: string;
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

    const requestBody: SignupRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.username || !requestBody.password || !requestBody.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username, password, and email are required' }),
      };
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(requestBody.password)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character' 
        }),
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestBody.email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' }),
      };
    }

    // Sign up user with Cognito
    const signUpParams = {
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: requestBody.username,
      Password: requestBody.password,
      UserAttributes: [
        {
          Name: 'email',
          Value: requestBody.email,
        },
        {
          Name: 'given_name',
          Value: requestBody.givenName || '',
        },
        {
          Name: 'family_name',
          Value: requestBody.familyName || '',
        },
      ],
    };

    const result = await cognito.signUp(signUpParams).promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'User created successfully',
        userSub: result.UserSub,
        codeDeliveryDetails: result.CodeDeliveryDetails,
      }),
    };
  } catch (error: any) {
    console.error('Signup error:', error);

    // Handle specific Cognito errors
    if (error.code === 'UsernameExistsException') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Username already exists' }),
      };
    }

    if (error.code === 'InvalidPasswordException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password does not meet requirements' }),
      };
    }

    if (error.code === 'InvalidParameterException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid parameters provided' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

