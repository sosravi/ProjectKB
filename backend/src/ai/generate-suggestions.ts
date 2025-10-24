import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntime, DynamoDB, S3 } from 'aws-sdk';

const bedrock = new BedrockRuntime();
const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

interface GenerateSuggestionsRequest {
  contentId: string;
  pkbId: string;
}

interface AuthenticatedUser {
  userId: string;
  username: string;
}

interface Suggestion {
  id: string;
  type: 'related_content' | 'improvement' | 'action_item';
  title: string;
  description: string;
  confidence: number;
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

    const requestBody: GenerateSuggestionsRequest = JSON.parse(event.body);

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

    // Get other content in the same PKB for context
    const otherContentParams = {
      TableName: process.env.CONTENT_TABLE!,
      IndexName: 'pkbId-index', // GSI on pkbId
      KeyConditionExpression: 'pkbId = :pkbId',
      FilterExpression: 'contentId <> :contentId',
      ExpressionAttributeValues: {
        ':pkbId': requestBody.pkbId,
        ':contentId': requestBody.contentId,
      },
    };

    const otherContentResult = await dynamodb.query(otherContentParams).promise();
    const otherContentTexts: string[] = [];

    // Retrieve other content for context (limit to 3 for performance)
    for (const otherContent of otherContentResult.Items?.slice(0, 3) || []) {
      try {
        const otherS3Params = {
          Bucket: process.env.S3_BUCKET!,
          Key: otherContent.s3Key,
        };

        const otherS3Result = await s3.getObject(otherS3Params).promise();
        const otherText = otherS3Result.Body?.toString() || '';
        
        if (otherText.trim()) {
          otherContentTexts.push(`${otherContent.fileName}: ${otherText.substring(0, 500)}...`);
        }
      } catch (s3Error) {
        console.error(`Failed to retrieve other content ${otherContent.contentId}:`, s3Error);
        // Continue with other content
      }
    }

    // Prepare prompt for Bedrock
    const contextText = otherContentTexts.join('\n\n');
    const prompt = `You are an AI assistant that provides intelligent suggestions for content improvement and related actions.

Current Content (${contentResult.Item.fileName}):
${contentText.substring(0, 2000)}...

Other Content in Project:
${contextText}

Please analyze this content and provide 3-5 intelligent suggestions for:
1. Content improvements (better structure, missing sections, clarity)
2. Related content that might be useful
3. Action items or next steps

Provide only a JSON response with this exact format:
{
  "suggestions": [
    {
      "id": "suggestion-1",
      "type": "improvement",
      "title": "Add Executive Summary",
      "description": "Consider adding a brief executive summary at the beginning to help readers quickly understand the key points.",
      "confidence": 0.9
    },
    {
      "id": "suggestion-2", 
      "type": "related_content",
      "title": "Link to Project Timeline",
      "description": "This content mentions project phases but could benefit from linking to a detailed timeline document.",
      "confidence": 0.8
    }
  ]
}

Types should be: "improvement", "related_content", or "action_item"
Confidence should be between 0.0 and 1.0
Be specific and actionable in your suggestions.`;

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

    try {
      const suggestionsData = JSON.parse(aiResponse);
      
      // Validate and clean suggestions
      const suggestions: Suggestion[] = suggestionsData.suggestions
        .filter((s: any) => s.title && s.description && s.type && s.confidence >= 0.5)
        .map((s: any, index: number) => ({
          id: s.id || `suggestion-${index}`,
          type: s.type,
          title: s.title,
          description: s.description,
          confidence: Math.min(Math.max(s.confidence, 0), 1), // Clamp between 0 and 1
        }))
        .slice(0, 5); // Limit to 5 suggestions

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          suggestions,
        }),
      };
    } catch (parseError) {
      console.error('Failed to parse suggestions response:', parseError);
      
      // Return default suggestions if parsing fails
      const defaultSuggestions: Suggestion[] = [
        {
          id: 'suggestion-1',
          type: 'improvement',
          title: 'Add Summary',
          description: 'Consider adding a summary section to help readers quickly understand the key points.',
          confidence: 0.7,
        },
        {
          id: 'suggestion-2',
          type: 'related_content',
          title: 'Link Related Documents',
          description: 'This content could benefit from links to related documents in your knowledge base.',
          confidence: 0.6,
        },
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          suggestions: defaultSuggestions,
        }),
      };
    }
  } catch (error: any) {
    console.error('Generate suggestions error:', error);

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
