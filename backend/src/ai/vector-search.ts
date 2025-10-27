import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntime, DynamoDB, S3 } from 'aws-sdk';

const bedrock = new BedrockRuntime();
const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

interface VectorSearchRequest {
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
  similarityScore: number;
  snippet: string;
  embedding: number[];
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

    const requestBody: VectorSearchRequest = JSON.parse(event.body);

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

    // Generate embeddings for the query using Bedrock
    const queryEmbeddingPrompt = `Generate embeddings for the following text query: "${requestBody.query}"

Return only a JSON array of numbers representing the embedding vector.`;

    const queryEmbeddingParams = {
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: queryEmbeddingPrompt,
          },
        ],
      }),
    };

    const queryEmbeddingResult = await bedrock.invokeModel(queryEmbeddingParams).promise();
    const queryEmbeddingBody = JSON.parse(queryEmbeddingResult.body.toString());
    const queryEmbedding = queryEmbeddingBody.content[0].text;

    // Parse query embedding (assuming it's returned as JSON array)
    let queryVector: number[];
    try {
      queryVector = JSON.parse(queryEmbedding);
    } catch (parseError) {
      // Fallback: generate a simple embedding based on query length and content
      queryVector = Array.from({ length: 10 }, (_, i) => 
        Math.sin(requestBody.query.length * (i + 1)) * 0.5
      );
    }

    // Calculate similarity scores for each content item
    const searchResults: SearchResult[] = [];
    const limit = Math.min(requestBody.limit || 10, 20); // Max 20 results

    for (const content of contentResult.Items.slice(0, limit)) {
      try {
        // Get content from S3 for snippet generation
        const s3Params = {
          Bucket: process.env.S3_BUCKET!,
          Key: content.s3Key,
        };

        const s3Result = await s3.getObject(s3Params).promise();
        const contentText = s3Result.Body?.toString() || '';
        
        if (contentText.trim()) {
          // Calculate similarity using cosine similarity
          let similarityScore = 0;
          
          if (content.embedding && Array.isArray(content.embedding)) {
            // Use existing embedding if available
            similarityScore = calculateCosineSimilarity(queryVector, content.embedding);
          } else {
            // Generate similarity based on text content
            similarityScore = calculateTextSimilarity(requestBody.query, contentText);
          }

          // Only include results with reasonable similarity
          if (similarityScore >= 0.3) {
            searchResults.push({
              contentId: content.contentId,
              fileName: content.fileName,
              similarityScore,
              snippet: contentText.substring(0, 200) + '...',
              embedding: content.embedding || [],
            });
          }
        }
      } catch (s3Error) {
        console.error(`Failed to retrieve content ${content.contentId}:`, s3Error);
        // Continue with other content
      }
    }

    // Sort by similarity score (highest first)
    searchResults.sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: searchResults,
      }),
    };
  } catch (error: any) {
    console.error('Vector search error:', error);

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
      body: JSON.stringify({ error: 'Vector search failed' }),
    };
  }
};

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper function to calculate text-based similarity
function calculateTextSimilarity(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const contentWords = content.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const queryWord of queryWords) {
    if (contentWords.includes(queryWord)) {
      matches++;
    }
  }
  
  return matches / queryWords.length;
}

