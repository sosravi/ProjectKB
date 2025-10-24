// Frontend Tests - React Testing Library
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from '../src/App';
import { LoginPage } from '../src/pages/LoginPage';
import { DashboardPage } from '../src/pages/DashboardPage';
import { VersionTooltip } from '../src/components/VersionTooltip';

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  configure: jest.fn(),
  Auth: {
    currentAuthenticatedUser: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
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

describe('App Component', () => {
  test('renders login page when not authenticated', () => {
    renderWithProviders(<App />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  test('redirects to dashboard when authenticated', async () => {
    // Mock authenticated user
    const mockUser = { username: 'testuser' };
    require('aws-amplify').Auth.currentAuthenticatedUser.mockResolvedValue(mockUser);

    renderWithProviders(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });
});

describe('LoginPage Component', () => {
  test('renders login form', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({});
    require('aws-amplify').Auth.signIn.mockImplementation(mockSignIn);

    renderWithProviders(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  test('shows error message on login failure', async () => {
    const mockSignIn = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    require('aws-amplify').Auth.signIn.mockImplementation(mockSignIn);

    renderWithProviders(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('renders Google and Microsoft login buttons', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument();
  });
});

describe('DashboardPage Component', () => {
  test('renders PKB list', () => {
    renderWithProviders(<DashboardPage />);
    
    expect(screen.getByText(/project knowledge bases/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create new pkb/i })).toBeInTheDocument();
  });

  test('displays empty state when no PKBs exist', () => {
    renderWithProviders(<DashboardPage />);
    
    expect(screen.getByText(/no project knowledge bases found/i)).toBeInTheDocument();
  });

  test('opens create PKB modal when button clicked', () => {
    renderWithProviders(<DashboardPage />);
    
    fireEvent.click(screen.getByRole('button', { name: /create new pkb/i }));
    
    expect(screen.getByText(/create project knowledge base/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });
});

describe('VersionTooltip Component', () => {
  test('displays version tooltip on hover', async () => {
    renderWithProviders(<VersionTooltip />);
    
    const versionElement = screen.getByTestId('version-tooltip');
    fireEvent.mouseEnter(versionElement);
    
    await waitFor(() => {
      expect(screen.getByText(/v1\.0\.0/i)).toBeInTheDocument();
    });
  });

  test('hides tooltip when mouse leaves', async () => {
    renderWithProviders(<VersionTooltip />);
    
    const versionElement = screen.getByTestId('version-tooltip');
    fireEvent.mouseEnter(versionElement);
    
    await waitFor(() => {
      expect(screen.getByText(/v1\.0\.0/i)).toBeInTheDocument();
    });
    
    fireEvent.mouseLeave(versionElement);
    
    await waitFor(() => {
      expect(screen.queryByText(/v1\.0\.0/i)).not.toBeInTheDocument();
    });
  });
});

// Integration Tests
describe('Authentication Flow', () => {
  test('complete login flow', async () => {
    const mockUser = { username: 'testuser' };
    const mockSignIn = jest.fn().mockResolvedValue(mockUser);
    require('aws-amplify').Auth.signIn.mockImplementation(mockSignIn);
    require('aws-amplify').Auth.currentAuthenticatedUser.mockResolvedValue(mockUser);

    renderWithProviders(<App />);
    
    // Should show login page initially
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    
    // Fill login form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Should redirect to dashboard
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });
});

// Accessibility Tests
describe('Accessibility', () => {
  test('login form has proper labels', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('buttons have accessible names', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument();
  });

  test('form validation messages are announced', async () => {
    renderWithProviders(<LoginPage />);
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
