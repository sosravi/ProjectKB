// Advanced AI Features Tests - Following TDD Principles
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { ImageAnalysisModal } from '../frontend/src/components/ImageAnalysisModal';
import { AudioTranscriptionModal } from '../frontend/src/components/AudioTranscriptionModal';
import { MultimediaQueryInterface } from '../frontend/src/components/MultimediaQueryInterface';
import { VectorSearchInterface } from '../frontend/src/components/VectorSearchInterface';
import { useMultimediaAi } from '../frontend/src/hooks/useMultimediaAi';

// Mock API calls
jest.mock('../frontend/src/services/multimediaAiService', () => ({
  analyzeImage: jest.fn(),
  transcribeAudio: jest.fn(),
  queryMultimedia: jest.fn(),
  vectorSearch: jest.fn(),
  generateEmbeddings: jest.fn(),
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

describe('Advanced AI Features - TDD Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Image Analysis Modal', () => {
    test('should render image analysis modal', () => {
      renderWithProviders(
        <ImageAnalysisModal 
          isOpen={true}
          onClose={jest.fn()}
          imageFile={new File(['image'], 'test.jpg', { type: 'image/jpeg' })}
          pkbId="pkb-1"
        />
      );
      
      expect(screen.getByText(/analyze image/i)).toBeInTheDocument();
      expect(screen.getByText(/test.jpg/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
    });

    test('should analyze image and display results', async () => {
      const mockAnalyzeImage = jest.fn().mockResolvedValue({
        description: 'A diagram showing project architecture with multiple components',
        objects: ['diagram', 'text', 'arrows', 'boxes'],
        text: 'Project Architecture\nFrontend\nBackend\nDatabase',
        confidence: 0.95,
        suggestions: [
          'Consider adding labels to the components',
          'The diagram could benefit from color coding'
        ]
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'analyzeImage').mockImplementation(mockAnalyzeImage);

      renderWithProviders(
        <ImageAnalysisModal 
          isOpen={true}
          onClose={jest.fn()}
          imageFile={new File(['image'], 'test.jpg', { type: 'image/jpeg' })}
          pkbId="pkb-1"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
      
      await waitFor(() => {
        expect(screen.getByText('A diagram showing project architecture with multiple components')).toBeInTheDocument();
        expect(screen.getByText('Objects detected:')).toBeInTheDocument();
        expect(screen.getByText('diagram')).toBeInTheDocument();
        expect(screen.getByText('text')).toBeInTheDocument();
        expect(screen.getByText('Project Architecture')).toBeInTheDocument();
      });
    });

    test('should display confidence score', async () => {
      const mockAnalyzeImage = jest.fn().mockResolvedValue({
        description: 'Test description',
        objects: ['object1'],
        text: 'Extracted text',
        confidence: 0.95,
        suggestions: []
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'analyzeImage').mockImplementation(mockAnalyzeImage);

      renderWithProviders(
        <ImageAnalysisModal 
          isOpen={true}
          onClose={jest.fn()}
          imageFile={new File(['image'], 'test.jpg', { type: 'image/jpeg' })}
          pkbId="pkb-1"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
      
      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument();
      });
    });

    test('should display suggestions', async () => {
      const mockAnalyzeImage = jest.fn().mockResolvedValue({
        description: 'Test description',
        objects: ['object1'],
        text: 'Extracted text',
        confidence: 0.95,
        suggestions: [
          'Consider adding labels to the components',
          'The diagram could benefit from color coding'
        ]
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'analyzeImage').mockImplementation(mockAnalyzeImage);

      renderWithProviders(
        <ImageAnalysisModal 
          isOpen={true}
          onClose={jest.fn()}
          imageFile={new File(['image'], 'test.jpg', { type: 'image/jpeg' })}
          pkbId="pkb-1"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Suggestions:')).toBeInTheDocument();
        expect(screen.getByText('Consider adding labels to the components')).toBeInTheDocument();
        expect(screen.getByText('The diagram could benefit from color coding')).toBeInTheDocument();
      });
    });

    test('should handle analysis errors', async () => {
      const mockAnalyzeImage = jest.fn().mockRejectedValue(new Error('Image analysis failed'));

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'analyzeImage').mockImplementation(mockAnalyzeImage);

      renderWithProviders(
        <ImageAnalysisModal 
          isOpen={true}
          onClose={jest.fn()}
          imageFile={new File(['image'], 'test.jpg', { type: 'image/jpeg' })}
          pkbId="pkb-1"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/image analysis failed/i)).toBeInTheDocument();
      });
    });

    test('should validate image file types', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      renderWithProviders(
        <ImageAnalysisModal 
          isOpen={true}
          onClose={jest.fn()}
          imageFile={invalidFile}
          pkbId="pkb-1"
        />
      );
      
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });
  });

  describe('Audio Transcription Modal', () => {
    test('should render audio transcription modal', () => {
      renderWithProviders(
        <AudioTranscriptionModal 
          isOpen={true}
          onClose={jest.fn()}
          audioFile={new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })}
          pkbId="pkb-1"
        />
      );
      
      expect(screen.getByText(/transcribe audio/i)).toBeInTheDocument();
      expect(screen.getByText(/test.mp3/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /transcribe/i })).toBeInTheDocument();
    });

    test('should transcribe audio and display results', async () => {
      const mockTranscribeAudio = jest.fn().mockResolvedValue({
        transcript: 'This is a test audio recording about project management and team collaboration.',
        confidence: 0.92,
        speakers: [
          { speaker: 'Speaker 1', text: 'This is a test audio recording' },
          { speaker: 'Speaker 2', text: 'about project management and team collaboration' }
        ],
        duration: 15.5,
        language: 'en-US'
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'transcribeAudio').mockImplementation(mockTranscribeAudio);

      renderWithProviders(
        <AudioTranscriptionModal 
          isOpen={true}
          onClose={jest.fn()}
          audioFile={new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })}
          pkbId="pkb-1"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /transcribe/i }));
      
      await waitFor(() => {
        expect(screen.getByText('This is a test audio recording about project management and team collaboration.')).toBeInTheDocument();
        expect(screen.getByText('Confidence: 92%')).toBeInTheDocument();
        expect(screen.getByText('Duration: 15.5 seconds')).toBeInTheDocument();
        expect(screen.getByText('Language: en-US')).toBeInTheDocument();
      });
    });

    test('should display speaker identification', async () => {
      const mockTranscribeAudio = jest.fn().mockResolvedValue({
        transcript: 'Test transcript',
        confidence: 0.92,
        speakers: [
          { speaker: 'Speaker 1', text: 'First part of conversation' },
          { speaker: 'Speaker 2', text: 'Second part of conversation' }
        ],
        duration: 15.5,
        language: 'en-US'
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'transcribeAudio').mockImplementation(mockTranscribeAudio);

      renderWithProviders(
        <AudioTranscriptionModal 
          isOpen={true}
          onClose={jest.fn()}
          audioFile={new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })}
          pkbId="pkb-1"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /transcribe/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Speaker 1:')).toBeInTheDocument();
        expect(screen.getByText('First part of conversation')).toBeInTheDocument();
        expect(screen.getByText('Speaker 2:')).toBeInTheDocument();
        expect(screen.getByText('Second part of conversation')).toBeInTheDocument();
      });
    });

    test('should handle transcription errors', async () => {
      const mockTranscribeAudio = jest.fn().mockRejectedValue(new Error('Transcription failed'));

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'transcribeAudio').mockImplementation(mockTranscribeAudio);

      renderWithProviders(
        <AudioTranscriptionModal 
          isOpen={true}
          onClose={jest.fn()}
          audioFile={new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })}
          pkbId="pkb-1"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /transcribe/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/transcription failed/i)).toBeInTheDocument();
      });
    });

    test('should validate audio file types', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      renderWithProviders(
        <AudioTranscriptionModal 
          isOpen={true}
          onClose={jest.fn()}
          audioFile={invalidFile}
          pkbId="pkb-1"
        />
      );
      
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });
  });

  describe('Multimedia Query Interface', () => {
    test('should render multimedia query interface', () => {
      renderWithProviders(
        <MultimediaQueryInterface 
          pkbId="pkb-1"
          onClose={jest.fn()}
        />
      );
      
      expect(screen.getByText(/multimedia ai assistant/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/ask about images, audio, or videos/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    test('should handle multimedia queries', async () => {
      const mockQueryMultimedia = jest.fn().mockResolvedValue({
        response: 'Based on the uploaded images, I can see a project architecture diagram showing three main components: frontend, backend, and database.',
        sources: ['architecture-diagram.png', 'meeting-recording.mp3'],
        multimediaTypes: ['image', 'audio']
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'queryMultimedia').mockImplementation(mockQueryMultimedia);

      renderWithProviders(
        <MultimediaQueryInterface 
          pkbId="pkb-1"
          onClose={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/ask about images, audio, or videos/i);
      fireEvent.change(input, { target: { value: 'What does the architecture diagram show?' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Based on the uploaded images, I can see a project architecture diagram showing three main components: frontend, backend, and database.')).toBeInTheDocument();
        expect(screen.getByText('Sources:')).toBeInTheDocument();
        expect(screen.getByText('architecture-diagram.png')).toBeInTheDocument();
        expect(screen.getByText('meeting-recording.mp3')).toBeInTheDocument();
      });
    });

    test('should display multimedia type indicators', async () => {
      const mockQueryMultimedia = jest.fn().mockResolvedValue({
        response: 'Test response',
        sources: ['image.jpg', 'audio.mp3'],
        multimediaTypes: ['image', 'audio']
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'queryMultimedia').mockImplementation(mockQueryMultimedia);

      renderWithProviders(
        <MultimediaQueryInterface 
          pkbId="pkb-1"
          onClose={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/ask about images, audio, or videos/i);
      fireEvent.change(input, { target: { value: 'Test query' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText('📷')).toBeInTheDocument(); // Image icon
        expect(screen.getByText('🎵')).toBeInTheDocument(); // Audio icon
      });
    });

    test('should handle query errors', async () => {
      const mockQueryMultimedia = jest.fn().mockRejectedValue(new Error('Multimedia query failed'));

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'queryMultimedia').mockImplementation(mockQueryMultimedia);

      renderWithProviders(
        <MultimediaQueryInterface 
          pkbId="pkb-1"
          onClose={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/ask about images, audio, or videos/i);
      fireEvent.change(input, { target: { value: 'Test query' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/multimedia query failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Vector Search Interface', () => {
    test('should render vector search interface', () => {
      renderWithProviders(
        <VectorSearchInterface 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      expect(screen.getByText(/vector search/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search by meaning and context/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    test('should perform vector search', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        results: [
          {
            contentId: 'content-1',
            fileName: 'project-doc.pdf',
            similarityScore: 0.95,
            snippet: 'This document contains information about project management methodologies',
            embedding: [0.1, 0.2, 0.3]
          },
          {
            contentId: 'content-2',
            fileName: 'meeting-notes.txt',
            similarityScore: 0.87,
            snippet: 'Notes from project planning meeting',
            embedding: [0.4, 0.5, 0.6]
          }
        ]
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'vectorSearch').mockImplementation(mockVectorSearch);

      renderWithProviders(
        <VectorSearchInterface 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/search by meaning and context/i);
      fireEvent.change(input, { target: { value: 'project management' } });
      
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByText('project-doc.pdf')).toBeInTheDocument();
        expect(screen.getByText('meeting-notes.txt')).toBeInTheDocument();
        expect(screen.getByText('This document contains information about project management methodologies')).toBeInTheDocument();
        expect(screen.getByText('95%')).toBeInTheDocument();
        expect(screen.getByText('87%')).toBeInTheDocument();
      });
    });

    test('should display similarity scores', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        results: [
          {
            contentId: 'content-1',
            fileName: 'high-similarity.pdf',
            similarityScore: 0.98,
            snippet: 'High similarity content',
            embedding: [0.1, 0.2, 0.3]
          }
        ]
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'vectorSearch').mockImplementation(mockVectorSearch);

      renderWithProviders(
        <VectorSearchInterface 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/search by meaning and context/i);
      fireEvent.change(input, { target: { value: 'test search' } });
      
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByText('98%')).toBeInTheDocument();
      });
    });

    test('should handle empty search results', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        results: []
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'vectorSearch').mockImplementation(mockVectorSearch);

      renderWithProviders(
        <VectorSearchInterface 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/search by meaning and context/i);
      fireEvent.change(input, { target: { value: 'no results query' } });
      
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    test('should handle search errors', async () => {
      const mockVectorSearch = jest.fn().mockRejectedValue(new Error('Vector search failed'));

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'vectorSearch').mockImplementation(mockVectorSearch);

      renderWithProviders(
        <VectorSearchInterface 
          pkbId="pkb-1"
          onResultSelect={jest.fn()}
        />
      );
      
      const input = screen.getByPlaceholderText(/search by meaning and context/i);
      fireEvent.change(input, { target: { value: 'error query' } });
      
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/vector search failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('useMultimediaAi Hook', () => {
    test('should return initial state', () => {
      const { result } = renderHook(() => useMultimediaAi('pkb-1'));
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.analyzeImage).toBe('function');
      expect(typeof result.current.transcribeAudio).toBe('function');
      expect(typeof result.current.queryMultimedia).toBe('function');
      expect(typeof result.current.vectorSearch).toBe('function');
    });

    test('should handle image analysis', async () => {
      const mockAnalyzeImage = jest.fn().mockResolvedValue({
        description: 'Test image description',
        objects: ['object1', 'object2'],
        text: 'Extracted text',
        confidence: 0.95,
        suggestions: ['suggestion1']
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'analyzeImage').mockImplementation(mockAnalyzeImage);

      const { result } = renderHook(() => useMultimediaAi('pkb-1'));
      
      await act(async () => {
        const analysis = await result.current.analyzeImage(new File(['image'], 'test.jpg', { type: 'image/jpeg' }));
        expect(analysis.description).toBe('Test image description');
        expect(analysis.objects).toContain('object1');
        expect(analysis.confidence).toBe(0.95);
      });
    });

    test('should handle audio transcription', async () => {
      const mockTranscribeAudio = jest.fn().mockResolvedValue({
        transcript: 'Test transcript',
        confidence: 0.92,
        speakers: [],
        duration: 15.5,
        language: 'en-US'
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'transcribeAudio').mockImplementation(mockTranscribeAudio);

      const { result } = renderHook(() => useMultimediaAi('pkb-1'));
      
      await act(async () => {
        const transcription = await result.current.transcribeAudio(new File(['audio'], 'test.mp3', { type: 'audio/mpeg' }));
        expect(transcription.transcript).toBe('Test transcript');
        expect(transcription.confidence).toBe(0.92);
        expect(transcription.duration).toBe(15.5);
      });
    });

    test('should handle multimedia queries', async () => {
      const mockQueryMultimedia = jest.fn().mockResolvedValue({
        response: 'Multimedia response',
        sources: ['source1', 'source2'],
        multimediaTypes: ['image', 'audio']
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'queryMultimedia').mockImplementation(mockQueryMultimedia);

      const { result } = renderHook(() => useMultimediaAi('pkb-1'));
      
      await act(async () => {
        const response = await result.current.queryMultimedia('Test query');
        expect(response.response).toBe('Multimedia response');
        expect(response.sources).toContain('source1');
        expect(response.multimediaTypes).toContain('image');
      });
    });

    test('should handle vector search', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        results: [
          {
            contentId: 'content-1',
            fileName: 'test.pdf',
            similarityScore: 0.95,
            snippet: 'Test snippet',
            embedding: [0.1, 0.2, 0.3]
          }
        ]
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'vectorSearch').mockImplementation(mockVectorSearch);

      const { result } = renderHook(() => useMultimediaAi('pkb-1'));
      
      await act(async () => {
        const results = await result.current.vectorSearch('test query');
        expect(results.results).toHaveLength(1);
        expect(results.results[0].fileName).toBe('test.pdf');
        expect(results.results[0].similarityScore).toBe(0.95);
      });
    });

    test('should handle errors', async () => {
      const mockAnalyzeImage = jest.fn().mockRejectedValue(new Error('Analysis failed'));

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'analyzeImage').mockImplementation(mockAnalyzeImage);

      const { result } = renderHook(() => useMultimediaAi('pkb-1'));
      
      await act(async () => {
        try {
          await result.current.analyzeImage(new File(['image'], 'test.jpg', { type: 'image/jpeg' }));
        } catch (error) {
          expect(error.message).toBe('Analysis failed');
        }
      });
    });
  });

  describe('Embedding Generation', () => {
    test('should generate embeddings for content', async () => {
      const mockGenerateEmbeddings = jest.fn().mockResolvedValue({
        embeddings: [0.1, 0.2, 0.3, 0.4, 0.5],
        model: 'text-embedding-ada-002'
      });

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'generateEmbeddings').mockImplementation(mockGenerateEmbeddings);

      const { result } = renderHook(() => useMultimediaAi('pkb-1'));
      
      await act(async () => {
        const embeddings = await result.current.generateEmbeddings('Test content');
        expect(embeddings.embeddings).toHaveLength(5);
        expect(embeddings.model).toBe('text-embedding-ada-002');
      });
    });

    test('should handle embedding generation errors', async () => {
      const mockGenerateEmbeddings = jest.fn().mockRejectedValue(new Error('Embedding generation failed'));

      jest.spyOn(require('../frontend/src/services/multimediaAiService'), 'generateEmbeddings').mockImplementation(mockGenerateEmbeddings);

      const { result } = renderHook(() => useMultimediaAi('pkb-1'));
      
      await act(async () => {
        try {
          await result.current.generateEmbeddings('Test content');
        } catch (error) {
          expect(error.message).toBe('Embedding generation failed');
        }
      });
    });
  });
});


