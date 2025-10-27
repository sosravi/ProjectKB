import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntime, Rekognition, DynamoDB, S3 } from 'aws-sdk';

const bedrock = new BedrockRuntime();
const rekognition = new Rekognition();
const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

interface AnalyzeImageRequest {
  contentId: string;
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

    // Extract user from JWT token (this would be done by API Gateway authorizer in real implementation)
    const user: AuthenticatedUser = JSON.parse(event.requestContext.authorizer?.user || '{}');
    if (!user.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const requestBody: AnalyzeImageRequest = JSON.parse(event.body);

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

    // Validate file type
    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedImageTypes.includes(contentResult.Item.fileType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File is not an image' }),
      };
    }

    // Retrieve image from S3
    const s3Params = {
      Bucket: process.env.S3_BUCKET!,
      Key: contentResult.Item.s3Key,
    };

    const s3Result = await s3.getObject(s3Params).promise();
    const imageBuffer = s3Result.Body as Buffer;

    if (!imageBuffer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image file is empty' }),
      };
    }

    // Use Rekognition to detect text and labels
    const [textResult, labelsResult] = await Promise.all([
      rekognition.detectText({
        Image: { Bytes: imageBuffer },
      }).promise(),
      rekognition.detectLabels({
        Image: { Bytes: imageBuffer },
        MaxLabels: 10,
        MinConfidence: 70,
      }).promise(),
    ]);

    // Extract text from Rekognition results
    const extractedText = textResult.TextDetections
      ?.filter(detection => detection.Type === 'LINE')
      .map(detection => detection.DetectedText)
      .join('\n') || '';

    // Extract labels from Rekognition results
    const detectedObjects = labelsResult.Labels
      ?.map(label => label.Name)
      .filter(name => name) || [];

    // Use Bedrock to analyze the image and provide insights
    const prompt = `You are an AI image analyst. Analyze this image and provide insights.

Image Information:
- File: ${contentResult.Item.fileName}
- Detected Objects: ${detectedObjects.join(', ')}
- Extracted Text: ${extractedText}

Please provide a comprehensive analysis in this exact JSON format:
{
  "description": "A detailed description of what you see in the image",
  "objects": ["list", "of", "detected", "objects"],
  "text": "Any text content found in the image",
  "confidence": 0.95,
  "suggestions": [
    "Helpful suggestions for improving the image",
    "Additional context or recommendations"
  ]
}

Guidelines:
- Description: Provide a clear, detailed description of the image content
- Objects: List all significant objects, elements, or features visible
- Text: Include any text content found in the image
- Confidence: Rate your confidence in the analysis (0.0 to 1.0)
- Suggestions: Provide 2-3 helpful suggestions for the user
- Be objective and analytical in your assessment`;

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
      const analysisData = JSON.parse(aiResponse);
      
      // Validate and clean the analysis
      const analysis = {
        description: analysisData.description || 'Image analysis completed',
        objects: Array.isArray(analysisData.objects) 
          ? analysisData.objects.slice(0, 10) 
          : detectedObjects.slice(0, 10),
        text: analysisData.text || extractedText,
        confidence: Math.min(Math.max(analysisData.confidence || 0.8, 0), 1),
        suggestions: Array.isArray(analysisData.suggestions)
          ? analysisData.suggestions.slice(0, 3)
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
      const defaultAnalysis = {
        description: 'Image analysis completed using AWS Rekognition',
        objects: detectedObjects.slice(0, 10),
        text: extractedText,
        confidence: 0.8,
        suggestions: [
          'Consider adding labels or annotations to improve clarity',
          'The image could benefit from higher resolution if available',
        ],
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultAnalysis),
      };
    }
  } catch (error: any) {
    console.error('Analyze image error:', error);

    // Handle specific AWS service errors
    if (error.code === 'InvalidImageFormat') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid image format' }),
      };
    }

    if (error.code === 'ImageTooLarge') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image file is too large' }),
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
      body: JSON.stringify({ error: 'Image analysis failed' }),
    };
  }
};

