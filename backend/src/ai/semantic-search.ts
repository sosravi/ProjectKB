import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntime, DynamoDB, S3 } from 'aws-sdk';

const bedrock = new BedrockRuntime();
const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

interface SemanticSearchRequest {
  query: string;
  pkbId: string;
  limit?: number;
}

interface AuthenticatedUser {
  userId: string;
  username: string;
}

interface SearchResult {
  contentId: string;
  fileName: string;
  relevanceScore: number;
  snippet: string;
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

    // Extract user from JWT token (this would be done by API Gateway authorizer in real implementation)
    const user: AuthenticatedUser = JSON.parse(event.requestContext.authorizer?.user || '{}');
    if (!user.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const requestBody: SemanticSearchRequest = JSON.parse(event.body);

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
        pkbId: requestBody.pkbId,
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
      IndexName: 'pkbId-index', // GSI on pkbId
      KeyConditionExpression: 'pkbId = :pkbId',
      ExpressionAttributeValues: {
        ':pkbId': requestBody.pkbId,
      },
    };

    const contentResult = await dynamodb.query(contentParams).promise();

    if (!contentResult.Items || contentResult.Items.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          results: [],
        }),
      };
    }

    // Retrieve content from S3 and perform semantic search
    const searchResults: SearchResult[] = [];
    const limit = Math.min(requestBody.limit || 10, 20); // Max 20 results

    for (const content of contentResult.Items.slice(0, limit)) {
      try {
        const s3Params = {
          Bucket: process.env.S3_BUCKET!,
          Key: content.s3Key,
        };

        const s3Result = await s3.getObject(s3Params).promise();
        const contentText = s3Result.Body?.toString() || '';
        
        if (contentText.trim()) {
          // Use Bedrock to calculate semantic similarity
          const similarityPrompt = `You are a semantic search engine. Calculate the relevance score (0.0 to 1.0) between the query and the content.

Query: "${requestBody.query}"

Content: "${contentText.substring(0, 1000)}..." (truncated)

Provide only a JSON response with:
{
  "relevanceScore": 0.85,
  "snippet": "Most relevant excerpt from the content"
}

Be strict with scoring - only high relevance (0.7+) should be included.`;

          const bedrockParams = {
            modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              max_tokens: 200,
              messages: [
                {
                  role: 'user',
                  content: similarityPrompt,
                },
              ],
            }),
          };

          const bedrockResult = await bedrock.invokeModel(bedrockParams).promise();
          const responseBody = JSON.parse(bedrockResult.body.toString());
          const aiResponse = responseBody.content[0].text;

          try {
            const similarityData = JSON.parse(aiResponse);
            
            if (similarityData.relevanceScore >= 0.7) {
              searchResults.push({
                contentId: content.contentId,
                fileName: content.fileName,
                relevanceScore: similarityData.relevanceScore,
                snippet: similarityData.snippet || contentText.substring(0, 200) + '...',
              });
            }
          } catch (parseError) {
            console.error('Failed to parse similarity response:', parseError);
            // Skip this content if parsing fails
          }
        }
      } catch (s3Error) {
        console.error(`Failed to retrieve content ${content.contentId}:`, s3Error);
        // Continue with other content
      }
    }

    // Sort by relevance score (highest first)
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: searchResults,
      }),
    };
  } catch (error: any) {
    console.error('Semantic search error:', error);

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


