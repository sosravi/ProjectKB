// File Upload System Tests - Following TDD Principles
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { FileUploadModal } from '../frontend/src/components/FileUploadModal';
import { ContentList } from '../frontend/src/components/ContentList';
import { ContentCard } from '../frontend/src/components/ContentCard';
import { FilePreview } from '../frontend/src/components/FilePreview';
import { useContent } from '../frontend/src/hooks/useContent';

// Mock API calls
jest.mock('../frontend/src/services/contentService', () => ({
  uploadFile: jest.fn(),
  getContent: jest.fn(),
  deleteContent: jest.fn(),
  getPresignedUrl: jest.fn(),
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

describe('File Upload System - TDD Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Upload Modal', () => {
    test('should render file upload modal', () => {
      renderWithProviders(
        <FileUploadModal 
          isOpen={true} 
          onClose={jest.fn()} 
          pkbId="pkb-1"
          onUploadSuccess={jest.fn()} 
        />
      );
      
      expect(screen.getByText(/upload files/i)).toBeInTheDocument();
      expect(screen.getByText(/drag and drop files/i)).toBeInTheDocument();
    });

    test('should accept file drops', async () => {
      const mockUploadSuccess = jest.fn();
      
      renderWithProviders(
        <FileUploadModal 
          isOpen={true} 
          onClose={jest.fn()} 
          pkbId="pkb-1"
          onUploadSuccess={mockUploadSuccess} 
        />
      );
      
      const dropZone = screen.getByTestId('file-drop-zone');
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });
    });

    test('should validate file types', async () => {
      renderWithProviders(
        <FileUploadModal 
          isOpen={true} 
          onClose={jest.fn()} 
          pkbId="pkb-1"
          onUploadSuccess={jest.fn()} 
        />
      );
      
      const dropZone = screen.getByTestId('file-drop-zone');
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [invalidFile],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument();
      });
    });

    test('should validate file sizes', async () => {
      renderWithProviders(
        <FileUploadModal 
          isOpen={true} 
          onClose={jest.fn()} 
          pkbId="pkb-1"
          onUploadSuccess={jest.fn()} 
        />
      );
      
      const dropZone = screen.getByTestId('file-drop-zone');
      // Create a large file (11MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [largeFile],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
    });

    test('should handle multiple file uploads', async () => {
      const mockUploadSuccess = jest.fn();
      
      renderWithProviders(
        <FileUploadModal 
          isOpen={true} 
          onClose={jest.fn()} 
          pkbId="pkb-1"
          onUploadSuccess={mockUploadSuccess} 
        />
      );
      
      const dropZone = screen.getByTestId('file-drop-zone');
      const files = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.txt', { type: 'text/plain' }),
        new File(['content3'], 'file3.txt', { type: 'text/plain' }),
      ];
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: files,
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
        expect(screen.getByText('file2.txt')).toBeInTheDocument();
        expect(screen.getByText('file3.txt')).toBeInTheDocument();
      });
    });

    test('should show upload progress', async () => {
      const mockUploadSuccess = jest.fn();
      
      renderWithProviders(
        <FileUploadModal 
          isOpen={true} 
          onClose={jest.fn()} 
          pkbId="pkb-1"
          onUploadSuccess={mockUploadSuccess} 
        />
      );
      
      const dropZone = screen.getByTestId('file-drop-zone');
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    test('should handle upload errors', async () => {
      const mockUploadSuccess = jest.fn();
      
      renderWithProviders(
        <FileUploadModal 
          isOpen={true} 
          onClose={jest.fn()} 
          pkbId="pkb-1"
          onUploadSuccess={mockUploadSuccess} 
        />
      );
      
      const dropZone = screen.getByTestId('file-drop-zone');
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      fireEvent.click(screen.getByRole('button', { name: /upload files/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });

    test('should remove files from upload list', async () => {
      renderWithProviders(
        <FileUploadModal 
          isOpen={true} 
          onClose={jest.fn()} 
          pkbId="pkb-1"
          onUploadSuccess={jest.fn()} 
        />
      );
      
      const dropZone = screen.getByTestId('file-drop-zone');
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      
      await waitFor(() => {
        expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
      });
    });
  });

  describe('Content List Component', () => {
    test('should render content list', () => {
      const mockContent = [
        {
          id: 'content-1',
          pkbId: 'pkb-1',
          fileName: 'document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'testuser'
        },
        {
          id: 'content-2',
          pkbId: 'pkb-1',
          fileName: 'image.jpg',
          fileType: 'image/jpeg',
          fileSize: 512000,
          uploadedAt: '2024-01-02T00:00:00Z',
          uploadedBy: 'testuser'
        }
      ];

      renderWithProviders(
        <ContentList 
          content={mockContent} 
          onDelete={jest.fn()} 
          onPreview={jest.fn()} 
        />
      );
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
    });

    test('should display empty state', () => {
      renderWithProviders(
        <ContentList 
          content={[]} 
          onDelete={jest.fn()} 
          onPreview={jest.fn()} 
        />
      );
      
      expect(screen.getByText(/no files uploaded/i)).toBeInTheDocument();
      expect(screen.getByText(/upload your first file/i)).toBeInTheDocument();
    });

    test('should handle content deletion', async () => {
      const mockOnDelete = jest.fn();
      const mockContent = [
        {
          id: 'content-1',
          pkbId: 'pkb-1',
          fileName: 'document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'testuser'
        }
      ];

      renderWithProviders(
        <ContentList 
          content={mockContent} 
          onDelete={mockOnDelete} 
          onPreview={jest.fn()} 
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
      
      expect(mockOnDelete).toHaveBeenCalledWith('content-1');
    });

    test('should handle content preview', () => {
      const mockOnPreview = jest.fn();
      const mockContent = [
        {
          id: 'content-1',
          pkbId: 'pkb-1',
          fileName: 'document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'testuser'
        }
      ];

      renderWithProviders(
        <ContentList 
          content={mockContent} 
          onDelete={jest.fn()} 
          onPreview={mockOnPreview} 
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /preview/i }));
      
      expect(mockOnPreview).toHaveBeenCalledWith(mockContent[0]);
    });

    test('should filter content by type', () => {
      const mockContent = [
        {
          id: 'content-1',
          pkbId: 'pkb-1',
          fileName: 'document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'testuser'
        },
        {
          id: 'content-2',
          pkbId: 'pkb-1',
          fileName: 'image.jpg',
          fileType: 'image/jpeg',
          fileSize: 512000,
          uploadedAt: '2024-01-02T00:00:00Z',
          uploadedBy: 'testuser'
        }
      ];

      renderWithProviders(
        <ContentList 
          content={mockContent} 
          onDelete={jest.fn()} 
          onPreview={jest.fn()} 
        />
      );
      
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'image' } });
      
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();
    });

    test('should search content by name', () => {
      const mockContent = [
        {
          id: 'content-1',
          pkbId: 'pkb-1',
          fileName: 'project-document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'testuser'
        },
        {
          id: 'content-2',
          pkbId: 'pkb-1',
          fileName: 'meeting-notes.pdf',
          fileType: 'application/pdf',
          fileSize: 512000,
          uploadedAt: '2024-01-02T00:00:00Z',
          uploadedBy: 'testuser'
        }
      ];

      renderWithProviders(
        <ContentList 
          content={mockContent} 
          onDelete={jest.fn()} 
          onPreview={jest.fn()} 
        />
      );
      
      fireEvent.change(screen.getByPlaceholderText(/search files/i), { 
        target: { value: 'project' } 
      });
      
      expect(screen.getByText('project-document.pdf')).toBeInTheDocument();
      expect(screen.queryByText('meeting-notes.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Content Card Component', () => {
    const mockContent = {
      id: 'content-1',
      pkbId: 'pkb-1',
      fileName: 'document.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      uploadedAt: '2024-01-01T00:00:00Z',
      uploadedBy: 'testuser'
    };

    test('should render content card', () => {
      renderWithProviders(
        <ContentCard 
          content={mockContent} 
          onDelete={jest.fn()} 
          onPreview={jest.fn()} 
        />
      );
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText(/1.0 mb/i)).toBeInTheDocument();
    });

    test('should display file type icon', () => {
      renderWithProviders(
        <ContentCard 
          content={mockContent} 
          onDelete={jest.fn()} 
          onPreview={jest.fn()} 
        />
      );
      
      expect(screen.getByTestId('file-type-icon')).toBeInTheDocument();
    });

    test('should format file size correctly', () => {
      const largeFile = {
        ...mockContent,
        fileSize: 1024 * 1024 * 5 // 5MB
      };

      renderWithProviders(
        <ContentCard 
          content={largeFile} 
          onDelete={jest.fn()} 
          onPreview={jest.fn()} 
        />
      );
      
      expect(screen.getByText(/5.0 mb/i)).toBeInTheDocument();
    });

    test('should handle card click for preview', () => {
      const mockOnPreview = jest.fn();
      
      renderWithProviders(
        <ContentCard 
          content={mockContent} 
          onDelete={jest.fn()} 
          onPreview={mockOnPreview} 
        />
      );
      
      fireEvent.click(screen.getByText('document.pdf'));
      
      expect(mockOnPreview).toHaveBeenCalledWith(mockContent);
    });
  });

  describe('File Preview Component', () => {
    test('should render image preview', () => {
      const mockContent = {
        id: 'content-1',
        pkbId: 'pkb-1',
        fileName: 'image.jpg',
        fileType: 'image/jpeg',
        fileSize: 512000,
        uploadedAt: '2024-01-01T00:00:00Z',
        uploadedBy: 'testuser',
        s3Key: 'uploads/image.jpg'
      };

      renderWithProviders(
        <FilePreview 
          content={mockContent} 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );
      
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    test('should render PDF preview', () => {
      const mockContent = {
        id: 'content-1',
        pkbId: 'pkb-1',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        uploadedAt: '2024-01-01T00:00:00Z',
        uploadedBy: 'testuser',
        s3Key: 'uploads/document.pdf'
      };

      renderWithProviders(
        <FilePreview 
          content={mockContent} 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    });

    test('should render text file preview', () => {
      const mockContent = {
        id: 'content-1',
        pkbId: 'pkb-1',
        fileName: 'notes.txt',
        fileType: 'text/plain',
        fileSize: 1024,
        uploadedAt: '2024-01-01T00:00:00Z',
        uploadedBy: 'testuser',
        s3Key: 'uploads/notes.txt'
      };

      renderWithProviders(
        <FilePreview 
          content={mockContent} 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );
      
      expect(screen.getByText('notes.txt')).toBeInTheDocument();
      expect(screen.getByTestId('text-viewer')).toBeInTheDocument();
    });

    test('should show unsupported file type message', () => {
      const mockContent = {
        id: 'content-1',
        pkbId: 'pkb-1',
        fileName: 'data.bin',
        fileType: 'application/octet-stream',
        fileSize: 1024,
        uploadedAt: '2024-01-01T00:00:00Z',
        uploadedBy: 'testuser',
        s3Key: 'uploads/data.bin'
      };

      renderWithProviders(
        <FilePreview 
          content={mockContent} 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );
      
      expect(screen.getByText(/preview not available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    });

    test('should handle download', () => {
      const mockContent = {
        id: 'content-1',
        pkbId: 'pkb-1',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        uploadedAt: '2024-01-01T00:00:00Z',
        uploadedBy: 'testuser',
        s3Key: 'uploads/document.pdf'
      };

      renderWithProviders(
        <FilePreview 
          content={mockContent} 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /download/i }));
      
      // Should trigger download
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });
  });

  describe('useContent Hook', () => {
    test('should return initial state', () => {
      const { result } = renderHook(() => useContent('pkb-1'));
      
      expect(result.current.content).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.uploadFile).toBe('function');
      expect(typeof result.current.deleteContent).toBe('function');
    });

    test('should load content on mount', async () => {
      const mockContent = [
        {
          id: 'content-1',
          pkbId: 'pkb-1',
          fileName: 'document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'testuser'
        }
      ];

      const mockGetContent = jest.fn().mockResolvedValue({ content: mockContent });
      jest.spyOn(require('../frontend/src/services/contentService'), 'getContent').mockImplementation(mockGetContent);

      const { result } = renderHook(() => useContent('pkb-1'));
      
      await waitFor(() => {
        expect(result.current.content).toEqual(mockContent);
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('should handle file upload', async () => {
      const mockUploadFile = jest.fn().mockResolvedValue({ id: 'content-1' });
      jest.spyOn(require('../frontend/src/services/contentService'), 'uploadFile').mockImplementation(mockUploadFile);

      const { result } = renderHook(() => useContent('pkb-1'));
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      await act(async () => {
        await result.current.uploadFile(file);
      });
      
      expect(mockUploadFile).toHaveBeenCalledWith('pkb-1', file);
    });

    test('should handle content deletion', async () => {
      const mockDeleteContent = jest.fn().mockResolvedValue({});
      jest.spyOn(require('../frontend/src/services/contentService'), 'deleteContent').mockImplementation(mockDeleteContent);

      const { result } = renderHook(() => useContent('pkb-1'));
      
      await act(async () => {
        await result.current.deleteContent('content-1');
      });
      
      expect(mockDeleteContent).toHaveBeenCalledWith('content-1');
    });

    test('should handle upload progress', async () => {
      const { result } = renderHook(() => useContent('pkb-1'));
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      await act(async () => {
        await result.current.uploadFile(file, (progress) => {
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        });
      });
    });
  });
});


