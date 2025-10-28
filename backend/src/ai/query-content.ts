import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntime, DynamoDB, S3 } from 'aws-sdk';

const bedrock = new BedrockRuntime();
const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

interface QueryContentRequest {
  query: string;
  pkbId: string;
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
    console.log('Auth token received:', token.substring(0, 20) + '...');
    const user: AuthenticatedUser = {
      userId: 'temp-user-id',
      username: 'temp-user'
    };

    const requestBody: QueryContentRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.query || !requestBody.pkbId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query and pkbId are required' }),
      };
    }

    // Validate query length
    if (requestBody.query.trim().length < 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query must be at least 3 characters' }),
      };
    }

    // First, verify that the user owns this PKB
    const pkbParams = {
      TableName: process.env.PKB_TABLE!,
      Key: {
        id: requestBody.pkbId,
      },
    };

    const pkbResult = await dynamodb.get(pkbParams).promise();

    if (!pkbResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'PKB not found' }),
      };
    }

    if (pkbResult.Item.userId !== user.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' }),
      };
    }

    // Get all content for this PKB
    const contentParams = {
      TableName: process.env.CONTENT_TABLE!,
      IndexName: 'pkbId-uploadedAt-index', // GSI on pkbId
      KeyConditionExpression: 'pkbId = :pkbId',
      ExpressionAttributeValues: {
        ':pkbId': requestBody.pkbId,
      },
    };

    const contentResult = await dynamodb.query(contentParams).promise();

    if (!contentResult.Items || contentResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No content found for this PKB' }),
      };
    }

    // Retrieve content from S3 and prepare context
    const contentContexts: string[] = [];
    const sources: string[] = [];

    for (const content of contentResult.Items) {
      try {
        const s3Params = {
          Bucket: process.env.S3_BUCKET!,
          Key: content.s3Key,
        };

        const s3Result = await s3.getObject(s3Params).promise();
        const contentText = s3Result.Body?.toString() || '';
        
        if (contentText.trim()) {
          contentContexts.push(`File: ${content.fileName}\nContent: ${contentText}`);
          sources.push(content.fileName);
        }
      } catch (s3Error) {
        console.error(`Failed to retrieve content ${content.contentId}:`, s3Error);
        // Continue with other content
      }
    }

    if (contentContexts.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No readable content found' }),
      };
    }

    // Prepare prompt for Bedrock
    const contextText = contentContexts.join('\n\n');
    const prompt = `You are an AI assistant helping users query their project knowledge base. 

Context from user's files:
${contextText}

User Question: ${requestBody.query}

Please provide a helpful answer based on the content above. If the answer is not found in the provided content, say so clearly. Include specific references to the files when relevant.

Answer:`;

    // Call Bedrock
    const bedrockParams = {
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    };

    const bedrockResult = await bedrock.invokeModel(bedrockParams).promise();
    const responseBody = JSON.parse(bedrockResult.body.toString());
    const aiResponse = responseBody.content[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: aiResponse,
        sources: sources.slice(0, 5), // Limit to 5 sources
      }),
    };
  } catch (error: any) {
    console.error('Query content error:', error);

    // Handle specific Bedrock errors
    if (error.code === 'ValidationException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request format' }),
      };
    }

    if (error.code === 'AccessDeniedException') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'AI service access denied' }),
      };
    }

    if (error.code === 'ThrottlingException') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'AI service rate limit exceeded' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'AI service unavailable' }),
    };
  }
};


