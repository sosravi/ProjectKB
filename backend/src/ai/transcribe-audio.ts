import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TranscribeService, DynamoDB, S3 } from 'aws-sdk';

const transcribe = new TranscribeService();
const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

interface TranscribeAudioRequest {
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

    const requestBody: TranscribeAudioRequest = JSON.parse(event.body);

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
    const supportedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'];
    if (!supportedAudioTypes.includes(contentResult.Item.fileType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File is not an audio file' }),
      };
    }

    // Generate unique job name
    const jobName = `transcribe-${requestBody.contentId}-${Date.now()}`;
    
    // Prepare S3 URI for the audio file
    const mediaFileUri = `s3://${process.env.S3_BUCKET}/${contentResult.Item.s3Key}`;

    // Start transcription job
    const transcriptionParams = {
      TranscriptionJobName: jobName,
      LanguageCode: 'en-US', // Default to English, could be made configurable
      Media: {
        MediaFileUri: mediaFileUri,
      },
      MediaFormat: contentResult.Item.fileType.split('/')[1], // Extract format from MIME type
      Settings: {
        ShowSpeakerLabels: true,
        MaxSpeakerLabels: 10,
      },
    };

    try {
      const transcriptionResult = await transcribe.startTranscriptionJob(transcriptionParams).promise();
      
      // Check if job completed immediately (unlikely for large files)
      if (transcriptionResult.TranscriptionJob?.TranscriptionJobStatus === 'COMPLETED') {
        // Get the transcript
        const transcriptUri = transcriptionResult.TranscriptionJob.Transcript?.TranscriptFileUri;
        if (transcriptUri) {
          // Extract S3 key from URI
          const s3Key = transcriptUri.split('/').slice(3).join('/');
          
          // Get transcript from S3
          const transcriptResult = await s3.getObject({
            Bucket: process.env.TRANSCRIBE_BUCKET || process.env.S3_BUCKET!,
            Key: s3Key,
          }).promise();
          
          const transcriptData = JSON.parse(transcriptResult.Body?.toString() || '{}');
          
          // Process transcript data
          const transcript = transcriptData.results?.transcripts?.[0]?.transcript || '';
          const confidence = transcriptData.results?.items?.[0]?.alternatives?.[0]?.confidence || 0.8;
          
          // Process speaker labels
          const speakers: Array<{ speaker: string; text: string }> = [];
          if (transcriptData.results?.speaker_labels?.segments) {
            for (const segment of transcriptData.results.speaker_labels.segments) {
              const speakerText = segment.items
                ?.map((item: any) => item.alternatives?.[0]?.content)
                .filter(Boolean)
                .join(' ') || '';
              
              if (speakerText) {
                speakers.push({
                  speaker: segment.speaker_label || 'Unknown Speaker',
                  text: speakerText,
                });
              }
            }
          }
          
          // Calculate duration
          const duration = transcriptData.results?.items?.[transcriptData.results.items.length - 1]?.end_time || 0;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              transcript,
              confidence: parseFloat(confidence),
              speakers,
              duration: parseFloat(duration),
              language: 'en-US',
            }),
          };
        }
      }
      
      // Job is in progress, return job ID for polling
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({
          message: 'Transcription job started',
          jobId: jobName,
          status: 'IN_PROGRESS',
        }),
      };
    } catch (transcribeError: any) {
      console.error('Transcribe service error:', transcribeError);
      
      if (transcribeError.code === 'BadRequestException') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid audio file format' }),
        };
      }
      
      if (transcribeError.code === 'ConflictException') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Transcription job already exists' }),
        };
      }
      
      throw transcribeError;
    }
  } catch (error: any) {
    console.error('Transcribe audio error:', error);

    // Handle specific AWS service errors
    if (error.code === 'AccessDeniedException') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Transcribe service access denied' }),
      };
    }

    if (error.code === 'ThrottlingException') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Transcribe service rate limit exceeded' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Audio transcription failed' }),
    };
  }
};


