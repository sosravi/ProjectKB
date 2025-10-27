// PKB Management Tests - Following TDD Principles
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../frontend/src/pages/DashboardPage';
import { PkbPage } from '../frontend/src/pages/PkbPage';
import { CreatePkbModal } from '../frontend/src/components/CreatePkbModal';
import { PkbCard } from '../frontend/src/components/PkbCard';
import { usePkb } from '../frontend/src/hooks/usePkb';

// Mock API calls
jest.mock('../frontend/src/services/pkbService', () => ({
  createPkb: jest.fn(),
  getPkbs: jest.fn(),
  updatePkb: jest.fn(),
  deletePkb: jest.fn(),
  getPkbById: jest.fn(),
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

describe('PKB Management - TDD Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Page', () => {
    test('should render PKB dashboard with create button', () => {
      renderWithProviders(<DashboardPage />);
      
      expect(screen.getByText(/project knowledge bases/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new pkb/i })).toBeInTheDocument();
    });

    test('should display empty state when no PKBs exist', () => {
      renderWithProviders(<DashboardPage />);
      
      expect(screen.getByText(/no project knowledge bases found/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first pkb to start organizing/i)).toBeInTheDocument();
    });

    test('should display PKB cards when PKBs exist', async () => {
      const mockPkbs = [
        {
          id: 'pkb-1',
          name: 'React Project',
          description: 'A React-based project',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          contentCount: 5
        },
        {
          id: 'pkb-2',
          name: 'Vue Project',
          description: 'A Vue.js project',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          contentCount: 3
        }
      ];

      // Mock the usePkb hook
      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: mockPkbs,
        isLoading: false,
        error: null,
        createPkb: jest.fn(),
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
      });

      renderWithProviders(<DashboardPage />);
      
      expect(screen.getByText('React Project')).toBeInTheDocument();
      expect(screen.getByText('Vue Project')).toBeInTheDocument();
      expect(screen.getByText('A React-based project')).toBeInTheDocument();
      expect(screen.getByText('A Vue.js project')).toBeInTheDocument();
    });

    test('should open create PKB modal when button clicked', () => {
      renderWithProviders(<DashboardPage />);
      
      fireEvent.click(screen.getByRole('button', { name: /create new pkb/i }));
      
      expect(screen.getByText(/create project knowledge base/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    test('should display loading state', () => {
      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: [],
        isLoading: true,
        error: null,
        createPkb: jest.fn(),
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
      });

      renderWithProviders(<DashboardPage />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should display error state', () => {
      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: [],
        isLoading: false,
        error: 'Failed to load PKBs',
        createPkb: jest.fn(),
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
      });

      renderWithProviders(<DashboardPage />);
      
      expect(screen.getByText(/failed to load pkbs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Create PKB Modal', () => {
    test('should render create PKB form', () => {
      renderWithProviders(
        <CreatePkbModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onCreateSuccess={jest.fn()} 
        />
      );
      
      expect(screen.getByText(/create project knowledge base/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should validate required fields', async () => {
      renderWithProviders(
        <CreatePkbModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onCreateSuccess={jest.fn()} 
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /create/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      });
    });

    test('should validate name length', async () => {
      renderWithProviders(
        <CreatePkbModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onCreateSuccess={jest.fn()} 
        />
      );
      
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'ab' } });
      fireEvent.click(screen.getByRole('button', { name: /create/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    test('should handle successful PKB creation', async () => {
      const mockCreatePkb = jest.fn().mockResolvedValue({
        id: 'pkb-1',
        name: 'Test PKB',
        description: 'Test description'
      });

      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: [],
        isLoading: false,
        error: null,
        createPkb: mockCreatePkb,
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
      });

      const onCreateSuccess = jest.fn();
      
      renderWithProviders(
        <CreatePkbModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onCreateSuccess={onCreateSuccess} 
        />
      );
      
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test PKB' } });
      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test description' } });
      fireEvent.click(screen.getByRole('button', { name: /create/i }));
      
      await waitFor(() => {
        expect(mockCreatePkb).toHaveBeenCalledWith({
          name: 'Test PKB',
          description: 'Test description'
        });
        expect(onCreateSuccess).toHaveBeenCalled();
      });
    });

    test('should handle creation errors', async () => {
      const mockCreatePkb = jest.fn().mockRejectedValue(new Error('Creation failed'));

      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: [],
        isLoading: false,
        error: null,
        createPkb: mockCreatePkb,
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
      });
      
      renderWithProviders(
        <CreatePkbModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onCreateSuccess={jest.fn()} 
        />
      );
      
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test PKB' } });
      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test description' } });
      fireEvent.click(screen.getByRole('button', { name: /create/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('PKB Card Component', () => {
    const mockPkb = {
      id: 'pkb-1',
      name: 'React Project',
      description: 'A React-based project',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      contentCount: 5
    };

    test('should render PKB card with all information', () => {
      renderWithProviders(<PkbCard pkb={mockPkb} onEdit={jest.fn()} onDelete={jest.fn()} />);
      
      expect(screen.getByText('React Project')).toBeInTheDocument();
      expect(screen.getByText('A React-based project')).toBeInTheDocument();
      expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    test('should handle edit button click', () => {
      const onEdit = jest.fn();
      renderWithProviders(<PkbCard pkb={mockPkb} onEdit={onEdit} onDelete={jest.fn()} />);
      
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      
      expect(onEdit).toHaveBeenCalledWith(mockPkb);
    });

    test('should handle delete button click with confirmation', () => {
      const onDelete = jest.fn();
      renderWithProviders(<PkbCard pkb={mockPkb} onEdit={jest.fn()} onDelete={onDelete} />);
      
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
      
      expect(onDelete).toHaveBeenCalledWith(mockPkb.id);
    });

    test('should cancel delete confirmation', () => {
      const onDelete = jest.fn();
      renderWithProviders(<PkbCard pkb={mockPkb} onEdit={jest.fn()} onDelete={onDelete} />);
      
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(onDelete).not.toHaveBeenCalled();
    });

    test('should navigate to PKB page when clicked', () => {
      renderWithProviders(<PkbCard pkb={mockPkb} onEdit={jest.fn()} onDelete={jest.fn()} />);
      
      fireEvent.click(screen.getByText('React Project'));
      
      // Should navigate to PKB page
      expect(window.location.pathname).toBe('/pkb/pkb-1');
    });
  });

  describe('PKB Page', () => {
    test('should render PKB details page', () => {
      renderWithProviders(<PkbPage />);
      
      expect(screen.getByText(/pkb details/i)).toBeInTheDocument();
    });

    test('should display PKB information', () => {
      const mockPkb = {
        id: 'pkb-1',
        name: 'React Project',
        description: 'A React-based project',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        contentCount: 5
      };

      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: [],
        isLoading: false,
        error: null,
        createPkb: jest.fn(),
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
        getPkbById: jest.fn().mockReturnValue(mockPkb),
      });

      renderWithProviders(<PkbPage />);
      
      expect(screen.getByText('React Project')).toBeInTheDocument();
      expect(screen.getByText('A React-based project')).toBeInTheDocument();
    });

    test('should display loading state', () => {
      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: [],
        isLoading: true,
        error: null,
        createPkb: jest.fn(),
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
        getPkbById: jest.fn(),
      });

      renderWithProviders(<PkbPage />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should display error state', () => {
      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: [],
        isLoading: false,
        error: 'PKB not found',
        createPkb: jest.fn(),
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
        getPkbById: jest.fn(),
      });

      renderWithProviders(<PkbPage />);
      
      expect(screen.getByText(/pkb not found/i)).toBeInTheDocument();
    });
  });

  describe('PKB Search and Filtering', () => {
    test('should render search input', () => {
      renderWithProviders(<DashboardPage />);
      
      expect(screen.getByPlaceholderText(/search pkbs/i)).toBeInTheDocument();
    });

    test('should filter PKBs by search term', async () => {
      const mockPkbs = [
        { id: 'pkb-1', name: 'React Project', description: 'A React project' },
        { id: 'pkb-2', name: 'Vue Project', description: 'A Vue project' },
        { id: 'pkb-3', name: 'Angular Project', description: 'An Angular project' }
      ];

      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: mockPkbs,
        isLoading: false,
        error: null,
        createPkb: jest.fn(),
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
      });

      renderWithProviders(<DashboardPage />);
      
      const searchInput = screen.getByPlaceholderText(/search pkbs/i);
      fireEvent.change(searchInput, { target: { value: 'React' } });
      
      await waitFor(() => {
        expect(screen.getByText('React Project')).toBeInTheDocument();
        expect(screen.queryByText('Vue Project')).not.toBeInTheDocument();
        expect(screen.queryByText('Angular Project')).not.toBeInTheDocument();
      });
    });

    test('should clear search and show all PKBs', async () => {
      const mockPkbs = [
        { id: 'pkb-1', name: 'React Project', description: 'A React project' },
        { id: 'pkb-2', name: 'Vue Project', description: 'A Vue project' }
      ];

      jest.spyOn(require('../frontend/src/hooks/usePkb'), 'usePkb').mockReturnValue({
        pkbs: mockPkbs,
        isLoading: false,
        error: null,
        createPkb: jest.fn(),
        updatePkb: jest.fn(),
        deletePkb: jest.fn(),
        refreshPkbs: jest.fn(),
      });

      renderWithProviders(<DashboardPage />);
      
      const searchInput = screen.getByPlaceholderText(/search pkbs/i);
      fireEvent.change(searchInput, { target: { value: 'React' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Vue Project')).not.toBeInTheDocument();
      });
      
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText('React Project')).toBeInTheDocument();
        expect(screen.getByText('Vue Project')).toBeInTheDocument();
      });
    });
  });

  describe('usePkb Hook', () => {
    test('should return initial state', () => {
      const { result } = renderHook(() => usePkb());
      
      expect(result.current.pkbs).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.createPkb).toBe('function');
      expect(typeof result.current.updatePkb).toBe('function');
      expect(typeof result.current.deletePkb).toBe('function');
    });

    test('should load PKBs on mount', async () => {
      const mockPkbs = [
        { id: 'pkb-1', name: 'Test PKB', description: 'Test description' }
      ];

      const mockGetPkbs = jest.fn().mockResolvedValue(mockPkbs);
      jest.spyOn(require('../frontend/src/services/pkbService'), 'getPkbs').mockImplementation(mockGetPkbs);

      const { result } = renderHook(() => usePkb());
      
      await waitFor(() => {
        expect(result.current.pkbs).toEqual(mockPkbs);
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('should handle PKB creation', async () => {
      const mockCreatePkb = jest.fn().mockResolvedValue({ id: 'pkb-1', name: 'New PKB' });
      jest.spyOn(require('../frontend/src/services/pkbService'), 'createPkb').mockImplementation(mockCreatePkb);

      const { result } = renderHook(() => usePkb());
      
      await act(async () => {
        await result.current.createPkb({ name: 'New PKB', description: 'Description' });
      });
      
      expect(mockCreatePkb).toHaveBeenCalledWith({ name: 'New PKB', description: 'Description' });
    });

    test('should handle PKB update', async () => {
      const mockUpdatePkb = jest.fn().mockResolvedValue({ id: 'pkb-1', name: 'Updated PKB' });
      jest.spyOn(require('../frontend/src/services/pkbService'), 'updatePkb').mockImplementation(mockUpdatePkb);

      const { result } = renderHook(() => usePkb());
      
      await act(async () => {
        await result.current.updatePkb('pkb-1', { name: 'Updated PKB' });
      });
      
      expect(mockUpdatePkb).toHaveBeenCalledWith('pkb-1', { name: 'Updated PKB' });
    });

    test('should handle PKB deletion', async () => {
      const mockDeletePkb = jest.fn().mockResolvedValue({});
      jest.spyOn(require('../frontend/src/services/pkbService'), 'deletePkb').mockImplementation(mockDeletePkb);

      const { result } = renderHook(() => usePkb());
      
      await act(async () => {
        await result.current.deletePkb('pkb-1');
      });
      
      expect(mockDeletePkb).toHaveBeenCalledWith('pkb-1');
    });
  });
});

