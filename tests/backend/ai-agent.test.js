// Backend AI Agent Tests - TDD Implementation
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');
const mockBedrock = new AWS.BedrockRuntime();
const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
const mockS3 = new AWS.S3();

// Mock environment variables
process.env.CONTENT_TABLE = 'test-content-table';
process.env.S3_BUCKET = 'test-projectkb-uploads';
process.env.BEDROCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

describe('AI Agent Lambda Functions - TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Content Handler', () => {
    test('should query content with AI and return response', async () => {
      const { handler } = require('../../backend/src/ai/query-content');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'What is this project about?',
          pkbId: 'pkb-1'
        })
      };

      // Mock content retrieval
      const mockContent = [
        {
          contentId: 'content-1',
          fileName: 'project-doc.pdf',
          fileType: 'application/pdf',
          s3Key: 'uploads/content-1/project-doc.pdf'
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
          Body: Buffer.from('This project is about building a knowledge management system.')
        })
      });

      // Mock Bedrock response
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            content: [{
              text: 'This project is about building a knowledge management system for organizing and querying project knowledge.'
            }]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('response');
      expect(body).toHaveProperty('sources');
      expect(body.sources).toContain('project-doc.pdf');
    });

    test('should validate required fields', async () => {
      const { handler } = require('../../backend/src/ai/query-content');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'What is this project about?'
          // Missing pkbId
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Query and pkbId are required');
    });

    test('should validate query length', async () => {
      const { handler } = require('../../backend/src/ai/query-content');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'ab', // Too short
          pkbId: 'pkb-1'
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Query must be at least 3 characters');
    });

    test('should handle empty content', async () => {
      const { handler } = require('../../backend/src/ai/query-content');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'What is this project about?',
          pkbId: 'pkb-1'
        })
      };

      // Mock empty content
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: []
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'No content found for this PKB');
    });

    test('should handle Bedrock errors', async () => {
      const { handler } = require('../../backend/src/ai/query-content');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'What is this project about?',
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
          Body: Buffer.from('Project content')
        })
      });

      // Mock Bedrock error
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.reject(new Error('Bedrock service unavailable'))
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'AI service unavailable');
    });

    test('should handle unauthorized access', async () => {
      const { handler } = require('../../backend/src/ai/query-content');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/query',
        headers: {
          Authorization: 'Bearer invalid-token'
        },
        body: JSON.stringify({
          query: 'What is this project about?',
          pkbId: 'pkb-1'
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Semantic Search Handler', () => {
    test('should perform semantic search', async () => {
      const { handler } = require('../../backend/src/ai/semantic-search');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/semantic-search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'project documentation',
          pkbId: 'pkb-1',
          limit: 10
        })
      };

      // Mock content retrieval
      const mockContent = [
        {
          contentId: 'content-1',
          fileName: 'project-doc.pdf',
          fileType: 'application/pdf',
          s3Key: 'uploads/content-1/project-doc.pdf'
        },
        {
          contentId: 'content-2',
          fileName: 'meeting-notes.txt',
          fileType: 'text/plain',
          s3Key: 'uploads/content-2/meeting-notes.txt'
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
          Body: Buffer.from('Project documentation content')
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

    test('should validate search query', async () => {
      const { handler } = require('../../backend/src/ai/semantic-search');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/semantic-search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'ab', // Too short
          pkbId: 'pkb-1'
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Query must be at least 3 characters');
    });

    test('should handle empty search results', async () => {
      const { handler } = require('../../backend/src/ai/semantic-search');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/semantic-search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'nonexistent content',
          pkbId: 'pkb-1'
        })
      };

      // Mock empty content
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: []
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.results).toHaveLength(0);
    });

    test('should limit search results', async () => {
      const { handler } = require('../../backend/src/ai/semantic-search');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/semantic-search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          query: 'test query',
          pkbId: 'pkb-1',
          limit: 5
        })
      };

      // Mock content retrieval
      const mockContent = Array.from({ length: 10 }, (_, i) => ({
        contentId: `content-${i}`,
        fileName: `doc-${i}.pdf`,
        fileType: 'application/pdf',
        s3Key: `uploads/content-${i}/doc-${i}.pdf`
      }));

      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockContent
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('Test content')
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
      expect(body.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Generate Suggestions Handler', () => {
    test('should generate content suggestions', async () => {
      const { handler } = require('../../backend/src/ai/generate-suggestions');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/suggestions',
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
        fileName: 'project-doc.pdf',
        fileType: 'application/pdf',
        s3Key: 'uploads/content-1/project-doc.pdf'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockContent
        })
      });

      // Mock S3 content retrieval
      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('Project documentation content')
        })
      });

      // Mock Bedrock response
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            content: [{
              text: JSON.stringify({
                suggestions: [
                  {
                    type: 'related_content',
                    title: 'Add Summary',
                    description: 'Consider adding a summary section',
                    confidence: 0.9
                  },
                  {
                    type: 'improvement',
                    title: 'Add Examples',
                    description: 'Include practical examples',
                    confidence: 0.8
                  }
                ]
              })
            }]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('suggestions');
      expect(body.suggestions).toHaveLength(2);
      expect(body.suggestions[0]).toHaveProperty('type', 'related_content');
    });

    test('should handle content not found', async () => {
      const { handler } = require('../../backend/src/ai/generate-suggestions');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/suggestions',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'nonexistent',
          pkbId: 'pkb-1'
        })
      };

      // Mock content not found
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({})
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Content not found');
    });

    test('should handle unauthorized access to content', async () => {
      const { handler } = require('../../backend/src/ai/generate-suggestions');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/suggestions',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          contentId: 'content-1',
          pkbId: 'pkb-1'
        })
      };

      const mockContent = {
        contentId: 'content-1',
        userId: 'different-user', // Different user
        fileName: 'project-doc.pdf',
        s3Key: 'uploads/content-1/project-doc.pdf'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockContent
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Access denied');
    });
  });

  describe('Analyze Content Handler', () => {
    test('should analyze content and return insights', async () => {
      const { handler } = require('../../backend/src/ai/analyze-content');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/analyze',
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
        fileName: 'project-doc.pdf',
        fileType: 'application/pdf',
        s3Key: 'uploads/content-1/project-doc.pdf'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockContent
        })
      });

      // Mock S3 content retrieval
      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('This project is about building a knowledge management system. It includes features for organizing, searching, and analyzing project content.')
        })
      });

      // Mock Bedrock response
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.resolve({
          body: JSON.stringify({
            content: [{
              text: JSON.stringify({
                summary: 'This document describes a knowledge management system project',
                keywords: ['project', 'knowledge', 'management', 'system'],
                sentiment: 'neutral',
                topics: ['knowledge management', 'project organization', 'content analysis']
              })
            }]
          })
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('keywords');
      expect(body).toHaveProperty('sentiment');
      expect(body).toHaveProperty('topics');
      expect(body.keywords).toContain('project');
    });

    test('should handle analysis errors', async () => {
      const { handler } = require('../../backend/src/ai/analyze-content');
      
      const event = {
        httpMethod: 'POST',
        path: '/ai/analyze',
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
          Item: { contentId: 'content-1', s3Key: 'uploads/content-1/doc.pdf' }
        })
      });

      mockS3.getObject.mockReturnValue({
        promise: () => Promise.resolve({
          Body: Buffer.from('Test content')
        })
      });

      // Mock Bedrock error
      mockBedrock.invokeModel.mockReturnValue({
        promise: () => Promise.reject(new Error('Analysis failed'))
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Content analysis failed');
    });
  });

  describe('AI Model Configuration', () => {
    test('should use correct Bedrock model', () => {
      expect(process.env.BEDROCK_MODEL_ID).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    });

    test('should handle model response format', () => {
      const mockResponse = {
        body: JSON.stringify({
          content: [{
            text: 'AI response text'
          }]
        })
      };

      const parsedResponse = JSON.parse(mockResponse.body);
      expect(parsedResponse.content[0].text).toBe('AI response text');
    });
  });
});
