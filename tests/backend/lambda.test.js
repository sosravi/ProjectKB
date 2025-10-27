// Backend Tests - Jest for Lambda Functions
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');
const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
const mockS3 = new AWS.S3();

// Mock environment variables
process.env.PKB_TABLE = 'test-pkb-table';
process.env.CONTENT_TABLE = 'test-content-table';
process.env.FILE_BUCKET = 'test-file-bucket';

describe('Auth Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle successful signup', async () => {
    const { handler } = require('../../backend/src/auth/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/auth/signup',
      body: JSON.stringify({
        username: 'testuser',
        password: 'Password123!',
        email: 'test@example.com',
        givenName: 'Test',
        familyName: 'User'
      })
    };

    const result = await handler(event);
    
    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toHaveProperty('message', 'User created successfully');
  });

  test('should handle signup with invalid password', async () => {
    const { handler } = require('../../backend/src/auth/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/auth/signup',
      body: JSON.stringify({
        username: 'testuser',
        password: 'weak',
        email: 'test@example.com'
      })
    };

    const result = await handler(event);
    
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty('error', 'Password does not meet requirements');
  });

  test('should handle successful signin', async () => {
    const { handler } = require('../../backend/src/auth/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/auth/signin',
      body: JSON.stringify({
        username: 'testuser',
        password: 'Password123!'
      })
    };

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toHaveProperty('accessToken');
    expect(JSON.parse(result.body)).toHaveProperty('refreshToken');
  });

  test('should handle signin with invalid credentials', async () => {
    const { handler } = require('../../backend/src/auth/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/auth/signin',
      body: JSON.stringify({
        username: 'testuser',
        password: 'wrongpassword'
      })
    };

    const result = await handler(event);
    
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toHaveProperty('error', 'Invalid credentials');
  });
});

describe('PKB Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create new PKB', async () => {
    const { handler } = require('../../backend/src/pkb/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/pkb',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      },
      body: JSON.stringify({
        name: 'Test PKB',
        description: 'A test project knowledge base'
      })
    };

    // Mock DynamoDB put
    mockDynamoDB.put.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toHaveProperty('pkbId');
    expect(JSON.parse(result.body)).toHaveProperty('name', 'Test PKB');
  });

  test('should list user PKBs', async () => {
    const { handler } = require('../../backend/src/pkb/index');
    
    const event = {
      httpMethod: 'GET',
      path: '/pkb',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      }
    };

    // Mock DynamoDB query
    mockDynamoDB.query.mockReturnValue({
      promise: () => Promise.resolve({
        Items: [
          {
            pkbId: 'pkb-1',
            name: 'Test PKB 1',
            description: 'First test PKB',
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            pkbId: 'pkb-2',
            name: 'Test PKB 2',
            description: 'Second test PKB',
            createdAt: '2024-01-02T00:00:00Z'
          }
        ]
      })
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('pkbs');
    expect(body.pkbs).toHaveLength(2);
  });

  test('should update PKB', async () => {
    const { handler } = require('../../backend/src/pkb/index');
    
    const event = {
      httpMethod: 'PUT',
      path: '/pkb/pkb-1',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      },
      body: JSON.stringify({
        name: 'Updated PKB',
        description: 'Updated description'
      })
    };

    // Mock DynamoDB update
    mockDynamoDB.update.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toHaveProperty('message', 'PKB updated successfully');
  });

  test('should delete PKB', async () => {
    const { handler } = require('../../backend/src/pkb/index');
    
    const event = {
      httpMethod: 'DELETE',
      path: '/pkb/pkb-1',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      }
    };

    // Mock DynamoDB delete
    mockDynamoDB.delete.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toHaveProperty('message', 'PKB deleted successfully');
  });

  test('should handle unauthorized access', async () => {
    const { handler } = require('../../backend/src/pkb/index');
    
    const event = {
      httpMethod: 'GET',
      path: '/pkb',
      headers: {
        Authorization: 'Bearer invalid-token'
      }
    };

    const result = await handler(event);
    
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toHaveProperty('error', 'Unauthorized');
  });
});

describe('Content Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should generate pre-signed URL for upload', async () => {
    const { handler } = require('../../backend/src/content/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/content/upload-url',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      },
      body: JSON.stringify({
        fileName: 'test-file.jpg',
        fileType: 'image/jpeg',
        pkbId: 'pkb-1'
      })
    };

    // Mock S3 getSignedUrl
    mockS3.getSignedUrl.mockReturnValue('https://s3.amazonaws.com/presigned-url');

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('uploadUrl');
    expect(body).toHaveProperty('fileId');
  });

  test('should list content for PKB', async () => {
    const { handler } = require('../../backend/src/content/index');
    
    const event = {
      httpMethod: 'GET',
      path: '/content/pkb-1',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      }
    };

    // Mock DynamoDB query
    mockDynamoDB.query.mockReturnValue({
      promise: () => Promise.resolve({
        Items: [
          {
            contentId: 'content-1',
            fileName: 'test-file.jpg',
            fileType: 'image/jpeg',
            uploadDate: '2024-01-01T00:00:00Z',
            size: 1024
          }
        ]
      })
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('content');
    expect(body.content).toHaveLength(1);
  });

  test('should delete content', async () => {
    const { handler } = require('../../backend/src/content/index');
    
    const event = {
      httpMethod: 'DELETE',
      path: '/content/content-1',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      }
    };

    // Mock S3 deleteObject
    mockS3.deleteObject.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    // Mock DynamoDB delete
    mockDynamoDB.delete.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toHaveProperty('message', 'Content deleted successfully');
  });
});

describe('AI Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should process text query', async () => {
    const { handler } = require('../../backend/src/ai/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/ai/query',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      },
      body: JSON.stringify({
        query: 'What is React?',
        pkbId: 'pkb-1',
        context: 'text'
      })
    };

    // Mock Bedrock invokeModel
    const mockBedrock = new AWS.BedrockRuntime();
    mockBedrock.invokeModel.mockReturnValue({
      promise: () => Promise.resolve({
        body: JSON.stringify({
          content: [{ text: 'React is a JavaScript library for building user interfaces.' }]
        })
      })
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('response');
    expect(body.response).toContain('React is a JavaScript library');
  });

  test('should process image query', async () => {
    const { handler } = require('../../backend/src/ai/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/ai/query',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      },
      body: JSON.stringify({
        query: 'Describe this image',
        pkbId: 'pkb-1',
        context: 'image',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg'
      })
    };

    // Mock Bedrock invokeModel with image
    const mockBedrock = new AWS.BedrockRuntime();
    mockBedrock.invokeModel.mockReturnValue({
      promise: () => Promise.resolve({
        body: JSON.stringify({
          content: [{ text: 'This image shows a diagram of a React component structure.' }]
        })
      })
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('response');
    expect(body.response).toContain('diagram');
  });

  test('should handle AI service errors', async () => {
    const { handler } = require('../../backend/src/ai/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/ai/query',
      headers: {
        Authorization: 'Bearer valid-jwt-token'
      },
      body: JSON.stringify({
        query: 'Test query',
        pkbId: 'pkb-1'
      })
    };

    // Mock Bedrock error
    const mockBedrock = new AWS.BedrockRuntime();
    mockBedrock.invokeModel.mockReturnValue({
      promise: () => Promise.reject(new Error('AI service unavailable'))
    });

    const result = await handler(event);
    
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toHaveProperty('error', 'AI service unavailable');
  });
});

// Integration Tests
describe('Lambda Integration Tests', () => {
  test('complete PKB creation flow', async () => {
    // Create PKB
    const { handler: pkbHandler } = require('../../backend/src/pkb/index');
    
    const createEvent = {
      httpMethod: 'POST',
      path: '/pkb',
      headers: { Authorization: 'Bearer valid-jwt-token' },
      body: JSON.stringify({
        name: 'Integration Test PKB',
        description: 'Testing complete flow'
      })
    };

    mockDynamoDB.put.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    const createResult = await pkbHandler(createEvent);
    expect(createResult.statusCode).toBe(201);
    
    const pkbId = JSON.parse(createResult.body).pkbId;

    // Upload content
    const { handler: contentHandler } = require('../../backend/src/content/index');
    
    const uploadEvent = {
      httpMethod: 'POST',
      path: '/content/upload-url',
      headers: { Authorization: 'Bearer valid-jwt-token' },
      body: JSON.stringify({
        fileName: 'test.txt',
        fileType: 'text/plain',
        pkbId: pkbId
      })
    };

    mockS3.getSignedUrl.mockReturnValue('https://s3.amazonaws.com/presigned-url');

    const uploadResult = await contentHandler(uploadEvent);
    expect(uploadResult.statusCode).toBe(200);
  });
});

// Performance Tests
describe('Lambda Performance Tests', () => {
  test('PKB creation should complete within 2 seconds', async () => {
    const { handler } = require('../../backend/src/pkb/index');
    
    const event = {
      httpMethod: 'POST',
      path: '/pkb',
      headers: { Authorization: 'Bearer valid-jwt-token' },
      body: JSON.stringify({
        name: 'Performance Test PKB',
        description: 'Testing response time'
      })
    };

    mockDynamoDB.put.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    const startTime = Date.now();
    const result = await handler(event);
    const endTime = Date.now();

    expect(result.statusCode).toBe(201);
    expect(endTime - startTime).toBeLessThan(2000); // 2 seconds
  });
});

