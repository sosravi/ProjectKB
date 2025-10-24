// Backend Advanced AI Features Tests - TDD Implementation
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');
const mockBedrock = new AWS.BedrockRuntime();
const mockTranscribe = new AWS.TranscribeService();
const mockRekognition = new AWS.Rekognition();
const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
const mockS3 = new AWS.S3();

// Mock environment variables
process.env.CONTENT_TABLE = 'test-content-table';
process.env.S3_BUCKET = 'test-projectkb-uploads';
process.env.BEDROCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
process.env.TRANSCRIBE_BUCKET = 'test-transcribe-bucket';

describe('Advanced AI Features Lambda Functions - TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Image Analysis Handler', () => {
    test('should analyze image and return results', async () => {
      const { handler } = require('../../backend/src/ai/analyze-image');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/analyze-image',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      const mockContent = {
        contentId: 'content-1',
        fileName: 'diagram.png',
        fileType: 'image/png',
        s3Key: 'uploads/content-1/diagram.png',
        userId: 'user-1'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockContent
        })
      });

      // Mock S3 image retrieval
      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('fake-image-data')
        })
      });

      // Mock Rekognition analysis
      mockRekognition.detectText.mockReturnValue({
        promise: () => Promise.resolve({
          TextDetections: [
            {
              DetectedText: 'Project Architecture',
              Confidence: 95.5,
              Type: 'LINE'
            },
            {
              DetectedText: 'Frontend',
              Confidence: 92.3,
              Type: 'WORD'
            }
          ]
        })
      });

      mockRekognition.detectLabels.mockReturnValue({
        promise: () => Promise.resolve({
          Labels: [
            {
              Name: 'Diagram',
              Confidence: 98.5
            },
            {
              Name: 'Text',
              Confidence: 95.2
            }
          ]
        })
      });

      // Mock Bedrock image analysis
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            content: [{
              text: JSON.stringify({
                description: 'A project architecture diagram showing system components',
                objects: ['diagram', 'text', 'arrows'],
                suggestions: [
                  'Consider adding component labels',
                  'The diagram could benefit from color coding'
                ]
              })
            }]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('description');
      expect(body).toHaveProperty('objects');
      expect(body).toHaveProperty('text');
      expect(body).toHaveProperty('confidence');
      expect(body).toHaveProperty('suggestions');
      expect(body.objects).toContain('diagram');
    });

    test('should validate image file types', async () => {
      const { handler } = require('../../backend/src/ai/analyze-image');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/analyze-image',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock non-image content
      const mockContent = {
        contentId: 'content-1',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        s3Key: 'uploads/content-1/document.pdf',
        userId: 'user-1'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockContent
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'File is not an image');
    });

    test('should handle Rekognition errors', async () => {
      const { handler } = require('../../backend/src/ai/analyze-image');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/analyze-image',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: {
            contentId: 'content-1',
            fileName: 'image.jpg',
            fileType: 'image/jpeg',
            s3Key: 'uploads/content-1/image.jpg',
            userId: 'user-1'
          }
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('fake-image-data')
        })
      });

      // Mock Rekognition error
      mockRekognition.detectText.mockReturnValue({
        promise: () => Promise.reject(new Error('Rekognition service unavailable'))
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Image analysis failed');
    });

    test('should handle unauthorized access', async () => {
      const { handler } = require('../../backend/src/ai/analyze-image');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/analyze-image',
        headers: {
          Authorization: 'Bearer invalid-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Audio Transcription Handler', () => {
    test('should transcribe audio and return results', async () => {
      const { handler } = require('../../backend/src/ai/transcribe-audio');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/transcribe-audio',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      const mockContent = {
        contentId: 'content-1',
        fileName: 'meeting.mp3',
        fileType: 'audio/mpeg',
        s3Key: 'uploads/content-1/meeting.mp3',
        userId: 'user-1'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockContent
        })
      });

      // Mock Transcribe job
      mockTranscribe.startTranscriptionJob.mockReturnValue({
        promise: () => Promise.resolve({
          TranscriptionJob: {
            TranscriptionJobName: 'job-123',
            TranscriptionJobStatus: 'IN_PROGRESS'
          }
        })
      });

      mockTranscribe.getTranscriptionJob.mockReturnValue({
        promise: () => Promise.resolve({
          TranscriptionJob: {
            TranscriptionJobStatus: 'COMPLETED',
            Transcript: {
              TranscriptFileUri: 'https://s3.amazonaws.com/bucket/transcript.json'
            }
          }
        })
      });

      // Mock S3 transcript retrieval
      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: JSON.stringify({
            results: {
              transcripts: [
                {
                  transcript: 'This is a test audio recording about project management.'
                }
              ],
              speaker_labels: {
                segments: [
                  {
                    speaker_label: 'spk_0',
                    start_time: '0.0',
                    end_time: '5.0'
                  }
                ]
              }
            }
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('transcript');
      expect(body).toHaveProperty('confidence');
      expect(body).toHaveProperty('speakers');
      expect(body).toHaveProperty('duration');
      expect(body).toHaveProperty('language');
    });

    test('should validate audio file types', async () => {
      const { handler } = require('../../backend/src/ai/transcribe-audio');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/transcribe-audio',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock non-audio content
      const mockContent = {
        contentId: 'content-1',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        s3Key: 'uploads/content-1/document.pdf',
        userId: 'user-1'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockContent
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'File is not an audio file');
    });

    test('should handle transcription job failures', async () => {
      const { handler } = require('../../backend/src/ai/transcribe-audio');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/transcribe-audio',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: {
            contentId: 'content-1',
            fileName: 'audio.mp3',
            fileType: 'audio/mpeg',
            s3Key: 'uploads/content-1/audio.mp3',
            userId: 'user-1'
          }
        })
      });

      // Mock Transcribe error
      mockTranscribe.startTranscriptionJob.mockReturnValue({
        promise: () => Promise.reject(new Error('Transcribe service unavailable'))
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Audio transcription failed');
    });

    test('should handle long transcription jobs', async () => {
      const { handler } = require('../../backend/src/ai/transcribe-audio');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/transcribe-audio',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: {
            contentId: 'content-1',
            fileName: 'long-audio.mp3',
            fileType: 'audio/mpeg',
            s3Key: 'uploads/content-1/long-audio.mp3',
            userId: 'user-1'
          }
        })
      });

      // Mock job still in progress
      mockTranscribe.startTranscriptionJob.mockReturnValue({
        promise: () => Promise.resolve({
          TranscriptionJob: {
            TranscriptionJobName: 'job-123',
            TranscriptionJobStatus: 'IN_PROGRESS'
          }
        })
      });

      mockTranscribe.getTranscriptionJob.mockReturnValue({
        promise: () => Promise.resolve({
          TranscriptionJob: {
            TranscriptionJobStatus: 'IN_PROGRESS'
          }
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(202);
      expect(JSON.parse(result.body)).toHaveProperty('message', 'Transcription job started');
      expect(JSON.parse(result.body)).toHaveProperty('jobId', 'job-123');
    });
  });

  describe('Multimedia Query Handler', () => {
    test('should query multimedia content', async () => {
      const { handler } = require('../../backend/src/ai/query-multimedia');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query-multimedia',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'What does the architecture diagram show?',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      const mockContent = [
        {
          contentId: 'content-1',
          fileName: 'diagram.png',
          fileType: 'image/png',
          s3Key: 'uploads/content-1/diagram.png'
        },
        {
          contentId: 'content-2',
          fileName: 'meeting.mp3',
          fileType: 'audio/mpeg',
          s3Key: 'uploads/content-2/meeting.mp3'
        }
      ];

      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockContent
        })
      });

      // Mock S3 content retrieval
      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('content data')
        })
      });

      // Mock Bedrock response
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            content: [{
              text: 'Based on the uploaded images, I can see a project architecture diagram showing three main components: frontend, backend, and database.'
            }]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('response');
      expect(body).toHaveProperty('sources');
      expect(body).toHaveProperty('multimediaTypes');
      expect(body.multimediaTypes).toContain('image');
      expect(body.multimediaTypes).toContain('audio');
    });

    test('should handle mixed content types', async () => {
      const { handler } = require('../../backend/src/ai/query-multimedia');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query-multimedia',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'Summarize the project documentation',
          pkbId: 'pkb-1'
        })
      };

      // Mock mixed content
      const mockContent = [
        {
          contentId: 'content-1',
          fileName: 'doc.pdf',
          fileType: 'application/pdf',
          s3Key: 'uploads/content-1/doc.pdf'
        },
        {
          contentId: 'content-2',
          fileName: 'diagram.png',
          fileType: 'image/png',
          s3Key: 'uploads/content-2/diagram.png'
        },
        {
          contentId: 'content-3',
          fileName: 'meeting.mp3',
          fileType: 'audio/mpeg',
          s3Key: 'uploads/content-3/meeting.mp3'
        }
      ];

      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockContent
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('content data')
        })
      });

      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            content: [{
              text: 'The project documentation includes text documents, architectural diagrams, and meeting recordings.'
            }]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.multimediaTypes).toContain('text');
      expect(body.multimediaTypes).toContain('image');
      expect(body.multimediaTypes).toContain('audio');
    });

    test('should handle query errors', async () => {
      const { handler } = require('../../backend/src/ai/query-multimedia');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query-multimedia',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'Test query',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: [{ contentId: 'content-1', s3Key: 'uploads/content-1/doc.pdf' }]
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('content data')
        })
      });

      // Mock Bedrock error
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.reject(new Error('Bedrock service unavailable'))
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Multimedia query failed');
    });
  });

  describe('Vector Search Handler', () => {
    test('should perform vector search', async () => {
      const { handler } = require('../../backend/src/ai/vector-search');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/vector-search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'project management methodologies',
          pkbId: 'pkb-1',
          limit: 5
        })
      };

      // Mock content retrieval
      const mockContent = [
        {
          contentId: 'content-1',
          fileName: 'project-doc.pdf',
          fileType: 'application/pdf',
          s3Key: 'uploads/content-1/project-doc.pdf',
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
        },
        {
          contentId: 'content-2',
          fileName: 'meeting-notes.txt',
          fileType: 'text/plain',
          s3Key: 'uploads/content-2/meeting-notes.txt',
          embedding: [0.6, 0.7, 0.8, 0.9, 1.0]
        }
      ];

      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockContent
        })
      });

      // Mock S3 content retrieval
      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('Project management content')
        })
      });

      // Mock Bedrock embeddings
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            embeddings: [0.1, 0.2, 0.3, 0.4, 0.5]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('results');
      expect(body.results).toBeInstanceOf(Array);
    });

    test('should calculate similarity scores', async () => {
      const { handler } = require('../../backend/src/ai/vector-search');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/vector-search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'test query',
          pkbId: 'pkb-1'
        })
      };

      // Mock content with embeddings
      const mockContent = [
        {
          contentId: 'content-1',
          fileName: 'high-similarity.pdf',
          s3Key: 'uploads/content-1/high-similarity.pdf',
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
        },
        {
          contentId: 'content-2',
          fileName: 'low-similarity.pdf',
          s3Key: 'uploads/content-2/low-similarity.pdf',
          embedding: [0.9, 0.8, 0.7, 0.6, 0.5]
        }
      ];

      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockContent
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('content')
        })
      });

      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            embeddings: [0.1, 0.2, 0.3, 0.4, 0.5]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.results[0].similarityScore).toBeGreaterThan(body.results[1].similarityScore);
    });

    test('should limit search results', async () => {
      const { handler } = require('../../backend/src/ai/vector-search');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/vector-search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'test query',
          pkbId: 'pkb-1',
          limit: 3
        })
      };

      // Mock many content items
      const mockContent = Array.from({ length: 10 }, (_, i) => ({
        contentId: `content-${i}`,
        fileName: `doc-${i}.pdf`,
        s3Key: `uploads/content-${i}/doc-${i}.pdf`,
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
      }));

      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockContent
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('content')
        })
      });

      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            embeddings: [0.1, 0.2, 0.3, 0.4, 0.5]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.results.length).toBeLessThanOrEqual(3);
    });

    test('should handle vector search errors', async () => {
      const { handler } = require('../../backend/src/ai/vector-search');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/vector-search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'test query',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: [{ contentId: 'content-1', s3Key: 'uploads/content-1/doc.pdf' }]
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('content')
        })
      });

      // Mock Bedrock error
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.reject(new Error('Bedrock service unavailable'))
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Vector search failed');
    });
  });

  describe('Embedding Generation Handler', () => {
    test('should generate embeddings for content', async () => {
      const { handler } = require('../../backend/src/ai/generate-embeddings');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/generate-embeddings',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      const mockContent = {
        contentId: 'content-1',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        s3Key: 'uploads/content-1/document.pdf',
        userId: 'user-1'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockContent
        })
      });

      // Mock S3 content retrieval
      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('This is a test document about project management.')
        })
      });

      // Mock Bedrock embeddings
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            embeddings: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
          })
        })
      });

      // Mock DynamoDB update
      mockDynamoDB.update.mockReturnValue({
        promise: () => Promise.resolve({})
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('embeddings');
      expect(body).toHaveProperty('model');
      expect(body.embeddings).toHaveLength(10);
    });

    test('should handle embedding generation errors', async () => {
      const { handler } = require('../../backend/src/ai/generate-embeddings');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/generate-embeddings',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: {
            contentId: 'content-1',
            fileName: 'document.pdf',
            s3Key: 'uploads/content-1/document.pdf',
            userId: 'user-1'
          }
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('Test content')
        })
      });

      // Mock Bedrock error
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.reject(new Error('Bedrock service unavailable'))
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Embedding generation failed');
    });
  });
});
