// Authentication Tests - Following TDD Principles
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { LoginPage } from '../frontend/src/pages/LoginPage';
import { SignupPage } from '../frontend/src/pages/SignupPage';
import { useAuth } from '../frontend/src/hooks/useAuth';

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  Auth: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    currentAuthenticatedUser: jest.fn(),
    confirmSignUp: jest.fn(),
    resendSignUpCode: jest.fn(),
    forgotPassword: jest.fn(),
    forgotPasswordSubmit: jest.fn(),
  },
  configure: jest.fn(),
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

describe('Authentication - TDD Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Signup Flow', () => {
    test('should render signup form with all required fields', () => {
      renderWithProviders(<SignupPage />);
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    test('should validate password requirements', async () => {
      renderWithProviders(<SignupPage />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    test('should handle successful signup', async () => {
      const mockSignUp = jest.fn().mockResolvedValue({
        user: { username: 'testuser' },
        userSub: 'test-sub'
      });
      (Auth.signUp as jest.Mock).mockImplementation(mockSignUp);

      renderWithProviders(<SignupPage />);
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
      
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          username: 'testuser',
          password: 'Password123!',
          attributes: {
            email: 'test@example.com',
            given_name: 'Test',
            family_name: 'User'
          }
        });
        expect(screen.getByText(/please check your email for verification/i)).toBeInTheDocument();
      });
    });
  });

  describe('Signin Flow', () => {
    test('should render signin form', () => {
      renderWithProviders(<LoginPage />);
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should handle successful signin', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({
        signInUserSession: {
          accessToken: { jwtToken: 'mock-access-token' },
          refreshToken: { token: 'mock-refresh-token' }
        }
      });
      (Auth.signIn as jest.Mock).mockImplementation(mockSignIn);

      renderWithProviders(<LoginPage />);
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });
      
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('testuser', 'Password123!');
      });
    });

    test('should handle signin errors', async () => {
      const mockSignIn = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      (Auth.signIn as jest.Mock).mockImplementation(mockSignIn);

      renderWithProviders(<LoginPage />);
      
      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
      
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('OAuth Integration', () => {
    test('should render Google and Microsoft login buttons', () => {
      renderWithProviders(<LoginPage />);
      
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument();
    });

    test('should handle Google OAuth login', async () => {
      renderWithProviders(<LoginPage />);
      
      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);
      
      // Mock Google OAuth flow
      await waitFor(() => {
        expect(screen.getByText(/redirecting to google/i)).toBeInTheDocument();
      });
    });
  });
});
