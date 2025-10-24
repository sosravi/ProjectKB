// Backend PKB Management Tests - TDD Implementation
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');
const mockDynamoDB = new AWS.DynamoDB.DocumentClient();

// Mock environment variables
process.env.PKB_TABLE = 'test-pkb-table';
process.env.CONTENT_TABLE = 'test-content-table';

describe('PKB Management Lambda Functions - TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create PKB Handler', () => {
    test('should create new PKB successfully', async () => {
      const { handler } = require('../../backend/src/pkb/create');
      
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
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('pkbId');
      expect(body).toHaveProperty('name', 'Test PKB');
      expect(body).toHaveProperty('description', 'A test project knowledge base');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
    });

    test('should validate required fields', async () => {
      const { handler } = require('../../backend/src/pkb/create');
      
      const event = {
        httpMethod: 'POST',
        path: '/pkb',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          description: 'Missing name'
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Name is required');
    });

    test('should validate name length', async () => {
      const { handler } = require('../../backend/src/pkb/create');
      
      const event = {
        httpMethod: 'POST',
        path: '/pkb',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          name: 'ab',
          description: 'Too short name'
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Name must be at least 3 characters');
    });

    test('should validate description length', async () => {
      const { handler } = require('../../backend/src/pkb/create');
      
      const event = {
        httpMethod: 'POST',
        path: '/pkb',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          name: 'Valid Name',
          description: 'a'.repeat(501) // Too long description
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Description must be less than 500 characters');
    });

    test('should handle unauthorized access', async () => {
      const { handler } = require('../../backend/src/pkb/create');
      
      const event = {
        httpMethod: 'POST',
        path: '/pkb',
        headers: {
          Authorization: 'Bearer invalid-token'
        },
        body: JSON.stringify({
          name: 'Test PKB',
          description: 'Test description'
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Unauthorized');
    });

    test('should handle DynamoDB errors', async () => {
      const { handler } = require('../../backend/src/pkb/create');
      
      const event = {
        httpMethod: 'POST',
        path: '/pkb',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          name: 'Test PKB',
          description: 'Test description'
        })
      };

      // Mock DynamoDB error
      mockDynamoDB.put.mockReturnValue({
        promise: () => Promise.reject(new Error('DynamoDB error'))
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Internal server error');
    });
  });

  describe('Get PKBs Handler', () => {
    test('should retrieve user PKBs successfully', async () => {
      const { handler } = require('../../backend/src/pkb/list');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        }
      };

      const mockPkbs = [
        {
          pkbId: 'pkb-1',
          userId: 'user-1',
          name: 'Test PKB 1',
          description: 'First test PKB',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          contentCount: 5
        },
        {
          pkbId: 'pkb-2',
          userId: 'user-1',
          name: 'Test PKB 2',
          description: 'Second test PKB',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          contentCount: 3
        }
      ];

      // Mock DynamoDB query
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockPkbs
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('pkbs');
      expect(body.pkbs).toHaveLength(2);
      expect(body.pkbs[0]).toHaveProperty('name', 'Test PKB 1');
      expect(body.pkbs[1]).toHaveProperty('name', 'Test PKB 2');
    });

    test('should return empty array when no PKBs exist', async () => {
      const { handler } = require('../../backend/src/pkb/list');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        }
      };

      // Mock empty DynamoDB query result
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: []
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('pkbs');
      expect(body.pkbs).toHaveLength(0);
    });

    test('should handle pagination', async () => {
      const { handler } = require('../../backend/src/pkb/list');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        queryStringParameters: {
          limit: '10',
          lastEvaluatedKey: 'pkb-1'
        }
      };

      const mockPkbs = [
        {
          pkbId: 'pkb-2',
          userId: 'user-1',
          name: 'Test PKB 2',
          description: 'Second test PKB',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          contentCount: 3
        }
      ];

      // Mock DynamoDB query with pagination
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockPkbs,
          LastEvaluatedKey: { pkbId: 'pkb-2' }
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('pkbs');
      expect(body).toHaveProperty('lastEvaluatedKey');
    });
  });

  describe('Get PKB by ID Handler', () => {
    test('should retrieve specific PKB successfully', async () => {
      const { handler } = require('../../backend/src/pkb/get');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb/pkb-1',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'pkb-1'
        }
      };

      const mockPkb = {
        pkbId: 'pkb-1',
        userId: 'user-1',
        name: 'Test PKB',
        description: 'Test description',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        contentCount: 5
      };

      // Mock DynamoDB get
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockPkb
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('pkb');
      expect(body.pkb).toHaveProperty('name', 'Test PKB');
      expect(body.pkb).toHaveProperty('description', 'Test description');
    });

    test('should handle PKB not found', async () => {
      const { handler } = require('../../backend/src/pkb/get');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb/nonexistent',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'nonexistent'
        }
      };

      // Mock DynamoDB get with no item
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({})
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'PKB not found');
    });

    test('should handle unauthorized access to PKB', async () => {
      const { handler } = require('../../backend/src/pkb/get');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb/pkb-1',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'pkb-1'
        }
      };

      const mockPkb = {
        pkbId: 'pkb-1',
        userId: 'different-user', // Different user
        name: 'Test PKB',
        description: 'Test description'
      };

      // Mock DynamoDB get
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockPkb
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Access denied');
    });
  });

  describe('Update PKB Handler', () => {
    test('should update PKB successfully', async () => {
      const { handler } = require('../../backend/src/pkb/update');
      
      const event = {
        httpMethod: 'PUT',
        path: '/pkb/pkb-1',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'pkb-1'
        },
        body: JSON.stringify({
          name: 'Updated PKB',
          description: 'Updated description'
        })
      };

      const mockPkb = {
        pkbId: 'pkb-1',
        userId: 'user-1',
        name: 'Original PKB',
        description: 'Original description'
      };

      // Mock DynamoDB get and update
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockPkb
        })
      });

      mockDynamoDB.update.mockReturnValue({
        promise: () => Promise.resolve({})
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('message', 'PKB updated successfully');
      expect(body).toHaveProperty('pkb');
      expect(body.pkb).toHaveProperty('name', 'Updated PKB');
    });

    test('should validate update data', async () => {
      const { handler } = require('../../backend/src/pkb/update');
      
      const event = {
        httpMethod: 'PUT',
        path: '/pkb/pkb-1',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'pkb-1'
        },
        body: JSON.stringify({
          name: 'ab' // Too short
        })
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Name must be at least 3 characters');
    });

    test('should handle PKB not found for update', async () => {
      const { handler } = require('../../backend/src/pkb/update');
      
      const event = {
        httpMethod: 'PUT',
        path: '/pkb/nonexistent',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'nonexistent'
        },
        body: JSON.stringify({
          name: 'Updated PKB'
        })
      };

      // Mock DynamoDB get with no item
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({})
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'PKB not found');
    });
  });

  describe('Delete PKB Handler', () => {
    test('should delete PKB successfully', async () => {
      const { handler } = require('../../backend/src/pkb/delete');
      
      const event = {
        httpMethod: 'DELETE',
        path: '/pkb/pkb-1',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'pkb-1'
        }
      };

      const mockPkb = {
        pkbId: 'pkb-1',
        userId: 'user-1',
        name: 'Test PKB',
        description: 'Test description'
      };

      // Mock DynamoDB get and delete
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockPkb
        })
      });

      mockDynamoDB.delete.mockReturnValue({
        promise: () => Promise.resolve({})
      });

      // Mock content deletion
      mockDynamoDB.query.mockReturnValue({
        promise: () => Promise.resolve({
          Items: [
            { contentId: 'content-1', pkbId: 'pkb-1' },
            { contentId: 'content-2', pkbId: 'pkb-1' }
          ]
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toHaveProperty('message', 'PKB deleted successfully');
    });

    test('should handle PKB not found for deletion', async () => {
      const { handler } = require('../../backend/src/pkb/delete');
      
      const event = {
        httpMethod: 'DELETE',
        path: '/pkb/nonexistent',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'nonexistent'
        }
      };

      // Mock DynamoDB get with no item
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({})
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'PKB not found');
    });

    test('should handle unauthorized deletion', async () => {
      const { handler } = require('../../backend/src/pkb/delete');
      
      const event = {
        httpMethod: 'DELETE',
        path: '/pkb/pkb-1',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        pathParameters: {
          pkbId: 'pkb-1'
        }
      };

      const mockPkb = {
        pkbId: 'pkb-1',
        userId: 'different-user', // Different user
        name: 'Test PKB',
        description: 'Test description'
      };

      // Mock DynamoDB get
      mockDynamoDB.get.mockReturnValue({
        promise: () => Promise.resolve({
          Item: mockPkb
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Access denied');
    });
  });

  describe('PKB Search Handler', () => {
    test('should search PKBs by name', async () => {
      const { handler } = require('../../backend/src/pkb/search');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb/search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        queryStringParameters: {
          q: 'React',
          limit: '10'
        }
      };

      const mockPkbs = [
        {
          pkbId: 'pkb-1',
          userId: 'user-1',
          name: 'React Project',
          description: 'A React-based project',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          contentCount: 5
        }
      ];

      // Mock DynamoDB scan with filter
      mockDynamoDB.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: mockPkbs
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('pkbs');
      expect(body.pkbs).toHaveLength(1);
      expect(body.pkbs[0]).toHaveProperty('name', 'React Project');
    });

    test('should handle empty search results', async () => {
      const { handler } = require('../../backend/src/pkb/search');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb/search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        queryStringParameters: {
          q: 'nonexistent'
        }
      };

      // Mock empty DynamoDB scan result
      mockDynamoDB.scan.mockReturnValue({
        promise: () => Promise.resolve({
          Items: []
        })
      });

      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('pkbs');
      expect(body.pkbs).toHaveLength(0);
    });

    test('should validate search query', async () => {
      const { handler } = require('../../backend/src/pkb/search');
      
      const event = {
        httpMethod: 'GET',
        path: '/pkb/search',
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        queryStringParameters: {
          q: 'ab' // Too short
        }
      };

      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error', 'Search query must be at least 3 characters');
    });
  });
});
