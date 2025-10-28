// AI Agent Integration Tests - Following TDD Principles
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { AiChatInterface } from '../frontend/src/components/AiChatInterface';
import { AiQueryModal } from '../frontend/src/components/AiQueryModal';
import { SemanticSearch } from '../frontend/src/components/SemanticSearch';
import { ContentSuggestions } from '../frontend/src/components/ContentSuggestions';
import { useAiAgent } from '../frontend/src/hooks/useAiAgent';

// Mock API calls
jest.mock('../frontend/src/services/aiService', () => ({
  queryContent: jest.fn(),
  semanticSearch: jest.fn(),
  generateSuggestions: jest.fn(),
  analyzeContent: jest.fn(),
}));

// Mock authentication
jest.mock('../frontend/src/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { username: 'testuser' },
    isLoading: false,
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ChakraProvider>
  );
};

describe('AI Agent Integration - TDD Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Chat Interface', () => {
    test('should render AI chat interface', () => {
      renderWithProviders(
        <AiChatInterface 
          pkbId="pkb-1"
          onClose={jest.fn()} 
        />
      );
      
      expect(screen.getByText(/ai assistant/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/ask about your content/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    test('should handle user message input', async () => {
      const mockQueryContent = jest.fn().mockResolvedValue({
        response: 'This is an AI response',
        sources: ['document.pdf', 'notes.txt']
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      renderWithProviders(
        <AiChatInterface 
          pkbId="pkb-1"
          onClose={jest.fn()} 
        />
      );
      
      const input = screen.getByPlaceholderText(/ask about your content/i);
      fireEvent.change(input, { target: { value: 'What is this project about?' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText('What is this project about?')).toBeInTheDocument();
      });
    });

    test('should display AI response', async () => {
      const mockQueryContent = jest.fn().mockResolvedValue({
        response: 'This project is about building a knowledge management system.',
        sources: ['document.pdf', 'notes.txt']
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      renderWithProviders(
        <AiChatInterface 
          pkbId="pkb-1"
          onClose={jest.fn()} 
        />
      );
      
      const input = screen.getByPlaceholderText(/ask about your content/i);
      fireEvent.change(input, { target: { value: 'What is this project about?' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText('This project is about building a knowledge management system.')).toBeInTheDocument();
        expect(screen.getByText('Sources:')).toBeInTheDocument();
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
        expect(screen.getByText('notes.txt')).toBeInTheDocument();
      });
    });

    test('should show loading state during AI processing', async () => {
      const mockQueryContent = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          response: 'AI response',
          sources: []
        }), 1000))
      );

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      renderWithProviders(
        <AiChatInterface 
          pkbId="pkb-1"
          onClose={jest.fn()} 
        />
      );
      
      const input = screen.getByPlaceholderText(/ask about your content/i);
      fireEvent.change(input, { target: { value: 'Test question' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      expect(screen.getByText(/ai is thinking/i)).toBeInTheDocument();
    });

    test('should handle AI query errors', async () => {
      const mockQueryContent = jest.fn().mockRejectedValue(new Error('AI service unavailable'));

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      renderWithProviders(
        <AiChatInterface 
          pkbId="pkb-1"
          onClose={jest.fn()} 
        />
      );
      
      const input = screen.getByPlaceholderText(/ask about your content/i);
      fireEvent.change(input, { target: { value: 'Test question' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/ai service unavailable/i)).toBeInTheDocument();
      });
    });

    test('should clear input after sending message', async () => {
      const mockQueryContent = jest.fn().mockResolvedValue({
        response: 'AI response',
        sources: []
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      renderWithProviders(
        <AiChatInterface 
          pkbId="pkb-1"
          onClose={jest.fn()} 
        />
      );
      
      const input = screen.getByPlaceholderText(/ask about your content/i);
      fireEvent.change(input, { target: { value: 'Test question' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    test('should handle empty message', () => {
      renderWithProviders(
        <AiChatInterface 
          pkbId="pkb-1"
          onClose={jest.fn()} 
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      expect(screen.getByText(/please enter a message/i)).toBeInTheDocument();
    });
  });

  describe('AI Query Modal', () => {
    test('should render AI query modal', () => {
      renderWithProviders(
        <AiQueryModal 
          isOpen={true}
          onClose={jest.fn()}
          pkbId="pkb-1"
        />
      );
      
      expect(screen.getByText(/ask ai about your content/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/what would you like to know/i)).toBeInTheDocument();
    });

    test('should handle quick query buttons', async () => {
      const mockQueryContent = jest.fn().mockResolvedValue({
        response: 'AI response',
        sources: []
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      renderWithProviders(
        <AiQueryModal 
          isOpen={true}
          onClose={jest.fn()}
          pkbId="pkb-1"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /summarize content/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/summarize all content/i)).toBeInTheDocument();
      });
    });

    test('should handle custom query input', async () => {
      const mockQueryContent = jest.fn().mockResolvedValue({
        response: 'Custom AI response',
        sources: []
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      renderWithProviders(
        <AiQueryModal 
          isOpen={true}
          onClose={jest.fn()}
          pkbId="pkb-1"
        />
      );
      
      const input = screen.getByPlaceholderText(/what would you like to know/i);
      fireEvent.change(input, { target: { value: 'Custom question' } });
      
      fireEvent.click(screen.getByRole('button', { name: /ask ai/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Custom AI response')).toBeInTheDocument();
      });
    });
  });

  describe('Semantic Search', () => {
    test('should render semantic search component', () => {
      renderWithProviders(
        <SemanticSearch 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      expect(screen.getByPlaceholderText(/search semantically/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    test('should perform semantic search', async () => {
      const mockSemanticSearch = jest.fn().mockResolvedValue({
        results: [
          {
            contentId: 'content-1',
            fileName: 'document.pdf',
            relevanceScore: 0.95,
            snippet: 'This document contains information about...'
          },
          {
            contentId: 'content-2',
            fileName: 'notes.txt',
            relevanceScore: 0.87,
            snippet: 'Notes about the project...'
          }
        ]
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'semanticSearch').mockImplementation(mockSemanticSearch);

      renderWithProviders(
        <SemanticSearch 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/search semantically/i);
      fireEvent.change(input, { target: { value: 'project documentation' } });
      
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
        expect(screen.getByText('notes.txt')).toBeInTheDocument();
        expect(screen.getByText('This document contains information about...')).toBeInTheDocument();
      });
    });

    test('should display relevance scores', async () => {
      const mockSemanticSearch = jest.fn().mockResolvedValue({
        results: [
          {
            contentId: 'content-1',
            fileName: 'document.pdf',
            relevanceScore: 0.95,
            snippet: 'Relevant content'
          }
        ]
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'semanticSearch').mockImplementation(mockSemanticSearch);

      renderWithProviders(
        <SemanticSearch 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/search semantically/i);
      fireEvent.change(input, { target: { value: 'test search' } });
      
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument();
      });
    });

    test('should handle empty search results', async () => {
      const mockSemanticSearch = jest.fn().mockResolvedValue({
        results: []
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'semanticSearch').mockImplementation(mockSemanticSearch);

      renderWithProviders(
        <SemanticSearch 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/search semantically/i);
      fireEvent.change(input, { target: { value: 'no results query' } });
      
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    test('should handle search errors', async () => {
      const mockSemanticSearch = jest.fn().mockRejectedValue(new Error('Search failed'));

      jest.spyOn(require('../frontend/src/services/aiService'), 'semanticSearch').mockImplementation(mockSemanticSearch);

      renderWithProviders(
        <SemanticSearch 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/search semantically/i);
      fireEvent.change(input, { target: { value: 'error query' } });
      
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/search failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Content Suggestions', () => {
    test('should render content suggestions', () => {
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          type: 'related_content',
          title: 'Related Document',
          description: 'This document is related to your current content',
          confidence: 0.9
        },
        {
          id: 'suggestion-2',
          type: 'improvement',
          title: 'Add Summary',
          description: 'Consider adding a summary to this document',
          confidence: 0.8
        }
      ];

      renderWithProviders(
        <ContentSuggestions 
          suggestions={mockSuggestions}
          onSuggestionClick={jest.fn()}
        />
      );
      
      expect(screen.getByText(/ai suggestions/i)).toBeInTheDocument();
      expect(screen.getByText('Related Document')).toBeInTheDocument();
      expect(screen.getByText('Add Summary')).toBeInTheDocument();
    });

    test('should handle suggestion clicks', () => {
      const mockOnSuggestionClick = jest.fn();
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          type: 'related_content',
          title: 'Related Document',
          description: 'This document is related to your current content',
          confidence: 0.9
        }
      ];

      renderWithProviders(
        <ContentSuggestions 
          suggestions={mockSuggestions}
          onSuggestionClick={mockOnSuggestionClick}
        />
      );
      
      fireEvent.click(screen.getByText('Related Document'));
      
      expect(mockOnSuggestionClick).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    test('should display confidence scores', () => {
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          type: 'related_content',
          title: 'High Confidence Suggestion',
          description: 'This suggestion has high confidence',
          confidence: 0.95
        }
      ];

      renderWithProviders(
        <ContentSuggestions 
          suggestions={mockSuggestions}
          onSuggestionClick={jest.fn()}
        />
      );
      
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    test('should handle empty suggestions', () => {
      renderWithProviders(
        <ContentSuggestions 
          suggestions={[]}
          onSuggestionClick={jest.fn()}
        />
      );
      
      expect(screen.getByText(/no suggestions available/i)).toBeInTheDocument();
    });
  });

  describe('useAiAgent Hook', () => {
    test('should return initial state', () => {
      const { result } = renderHook(() => useAiAgent('pkb-1'));
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.queryContent).toBe('function');
      expect(typeof result.current.semanticSearch).toBe('function');
      expect(typeof result.current.generateSuggestions).toBe('function');
    });

    test('should handle content querying', async () => {
      const mockQueryContent = jest.fn().mockResolvedValue({
        response: 'AI response',
        sources: ['doc1.pdf']
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      const { result } = renderHook(() => useAiAgent('pkb-1'));
      
      await act(async () => {
        const response = await result.current.queryContent('Test question');
        expect(response.response).toBe('AI response');
        expect(response.sources).toEqual(['doc1.pdf']);
      });
    });

    test('should handle semantic search', async () => {
      const mockSemanticSearch = jest.fn().mockResolvedValue({
        results: [
          {
            contentId: 'content-1',
            fileName: 'document.pdf',
            relevanceScore: 0.95,
            snippet: 'Relevant content'
          }
        ]
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'semanticSearch').mockImplementation(mockSemanticSearch);

      const { result } = renderHook(() => useAiAgent('pkb-1'));
      
      await act(async () => {
        const results = await result.current.semanticSearch('test query');
        expect(results.results).toHaveLength(1);
        expect(results.results[0].fileName).toBe('document.pdf');
      });
    });

    test('should handle suggestion generation', async () => {
      const mockGenerateSuggestions = jest.fn().mockResolvedValue({
        suggestions: [
          {
            id: 'suggestion-1',
            type: 'related_content',
            title: 'Related Document',
            description: 'This document is related',
            confidence: 0.9
          }
        ]
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'generateSuggestions').mockImplementation(mockGenerateSuggestions);

      const { result } = renderHook(() => useAiAgent('pkb-1'));
      
      await act(async () => {
        const suggestions = await result.current.generateSuggestions('content-1');
        expect(suggestions.suggestions).toHaveLength(1);
        expect(suggestions.suggestions[0].title).toBe('Related Document');
      });
    });

    test('should handle errors', async () => {
      const mockQueryContent = jest.fn().mockRejectedValue(new Error('AI service error'));

      jest.spyOn(require('../frontend/src/services/aiService'), 'queryContent').mockImplementation(mockQueryContent);

      const { result } = renderHook(() => useAiAgent('pkb-1'));
      
      await act(async () => {
        try {
          await result.current.queryContent('Test question');
        } catch (error) {
          expect(error.message).toBe('AI service error');
        }
      });
    });
  });

  describe('AI Content Analysis', () => {
    test('should analyze text content', async () => {
      const mockAnalyzeContent = jest.fn().mockResolvedValue({
        summary: 'This document contains information about project management',
        keywords: ['project', 'management', 'planning'],
        sentiment: 'positive',
        topics: ['project management', 'planning', 'organization']
      });

      jest.spyOn(require('../frontend/src/services/aiService'), 'analyzeContent').mockImplementation(mockAnalyzeContent);

      const { result } = renderHook(() => useAiAgent('pkb-1'));
      
      await act(async () => {
        const analysis = await result.current.analyzeContent('content-1');
        expect(analysis.summary).toBe('This document contains information about project management');
        expect(analysis.keywords).toContain('project');
        expect(analysis.sentiment).toBe('positive');
      });
    });

    test('should handle analysis errors', async () => {
      const mockAnalyzeContent = jest.fn().mockRejectedValue(new Error('Analysis failed'));

      jest.spyOn(require('../frontend/src/services/aiService'), 'analyzeContent').mockImplementation(mockAnalyzeContent);

      const { result } = renderHook(() => useAiAgent('pkb-1'));
      
      await act(async () => {
        try {
          await result.current.analyzeContent('content-1');
        } catch (error) {
          expect(error.message).toBe('Analysis failed');
        }
      });
    });
  });
});


