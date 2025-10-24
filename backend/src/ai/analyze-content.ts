import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntime, DynamoDB, S3 } from 'aws-sdk';

const bedrock = new BedrockRuntime();
const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

interface AnalyzeContentRequest {
  contentId: string;
  pkbId: string;
}

interface AuthenticatedUser {
  userId: string;
  username: string;
}

interface ContentAnalysis {
  summary: string;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
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

    const requestBody: AnalyzeContentRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.contentId || !requestBody.pkbId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contentId and pkbId are required' }),
      };
    }

    // Get the specific content
    const contentParams = {
      TableName: process.env.CONTENT_TABLE!,
      Key: {
        contentId: requestBody.contentId,
      },
    };

    const contentResult = await dynamodb.get(contentParams).promise();

    if (!contentResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Content not found' }),
      };
    }

    // Check if user owns this content
    if (contentResult.Item.userId !== user.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' }),
      };
    }

    // Retrieve content from S3
    const s3Params = {
      Bucket: process.env.S3_BUCKET!,
      Key: contentResult.Item.s3Key,
    };

    const s3Result = await s3.getObject(s3Params).promise();
    const contentText = s3Result.Body?.toString() || '';

    if (!contentText.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content is empty' }),
      };
    }

    // Prepare prompt for Bedrock
    const prompt = `You are an AI content analyst. Analyze the following content and provide insights.

Content (${contentResult.Item.fileName}):
${contentText.substring(0, 3000)}...

Please provide a comprehensive analysis in this exact JSON format:
{
  "summary": "A concise 2-3 sentence summary of the main points and purpose of this content.",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "sentiment": "positive|negative|neutral",
  "topics": ["topic1", "topic2", "topic3"]
}

Guidelines:
- Summary: Capture the main purpose and key points
- Keywords: Extract 5 most important terms/concepts (no duplicates)
- Sentiment: Overall tone (positive, negative, or neutral)
- Topics: 3 main subject areas or themes
- Be objective and analytical
- Focus on content substance, not writing quality`;

    // Call Bedrock
    const bedrockParams = {
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 800,
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

    try {
      const analysisData = JSON.parse(aiResponse);
      
      // Validate and clean the analysis
      const analysis: ContentAnalysis = {
        summary: analysisData.summary || 'Content analysis not available',
        keywords: Array.isArray(analysisData.keywords) 
          ? analysisData.keywords.slice(0, 5) 
          : [],
        sentiment: ['positive', 'negative', 'neutral'].includes(analysisData.sentiment)
          ? analysisData.sentiment
          : 'neutral',
        topics: Array.isArray(analysisData.topics)
          ? analysisData.topics.slice(0, 3)
          : [],
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(analysis),
      };
    } catch (parseError) {
      console.error('Failed to parse analysis response:', parseError);
      
      // Return default analysis if parsing fails
      const defaultAnalysis: ContentAnalysis = {
        summary: 'Content analysis completed but detailed insights are not available.',
        keywords: ['content', 'document', 'information'],
        sentiment: 'neutral',
        topics: ['general content'],
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultAnalysis),
      };
    }
  } catch (error: any) {
    console.error('Analyze content error:', error);

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
      body: JSON.stringify({ error: 'Content analysis failed' }),
    };
  }
};
