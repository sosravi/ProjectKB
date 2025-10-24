import React, { useState } from 'react';
import { Box, Flex, Heading, Text, Button, VStack, HStack, Input, FormControl, FormLabel, FormErrorMessage, Alert, AlertIcon, Link, Icon } from '@chakra-ui/react';
import { Auth } from 'aws-amplify';
import { FaGoogle, FaMicrosoft } from 'react-icons/fa';

interface LoginFormData {
  username: string;
  password: string;
}

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onLoginSuccess, 
  onSwitchToSignup 
}) => {
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });
  
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await Auth.signIn(formData.username, formData.password);
      
      setMessage({
        type: 'success',
        text: 'Signed in successfully!'
      });

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('Signin error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Invalid credentials'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Mock Google OAuth flow - in real implementation, this would redirect to Google
      setMessage({
        type: 'success',
        text: 'Redirecting to Google...'
      });
      
      // In real implementation, this would be:
      // await Auth.federatedSignIn({ provider: 'Google' });
    } catch (error: any) {
      console.error('Google signin error:', error);
      setMessage({
        type: 'error',
        text: 'Google sign-in failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Mock Microsoft OAuth flow - in real implementation, this would redirect to Microsoft
      setMessage({
        type: 'success',
        text: 'Redirecting to Microsoft...'
      });
      
      // In real implementation, this would be:
      // await Auth.federatedSignIn({ provider: 'Microsoft' });
    } catch (error: any) {
      console.error('Microsoft signin error:', error);
      setMessage({
        type: 'error',
        text: 'Microsoft sign-in failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter your email address'
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await Auth.forgotPassword(forgotPasswordEmail);
      setMessage({
        type: 'success',
        text: 'Password reset code sent to your email'
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send reset code'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <Box
          bg="white"
          p={8}
          borderRadius="xl"
          boxShadow="lg"
          w="full"
          maxW="md"
        >
          <VStack spacing={6}>
            <Heading size="lg" color="gray.800">
              Reset Password
            </Heading>
            <Text color="gray.600" textAlign="center">
              Enter your email address to receive a password reset code
            </Text>
            
            {message && (
              <Alert status={message.type} borderRadius="md" w="full">
                <AlertIcon />
                {message.text}
              </Alert>
            )}
            
            <VStack spacing={4} w="full">
              <FormControl>
                <FormLabel>Email Address</FormLabel>
                <Input
                  data-testid="forgot-password-email-input"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </FormControl>
              
              <Button
                data-testid="send-reset-code-button"
                w="full"
                bg="brand.500"
                color="white"
                _hover={{ bg: 'brand.600' }}
                size="lg"
                onClick={handleForgotPassword}
                isLoading={isLoading}
                loadingText="Sending..."
              >
                Send Reset Code
              </Button>
              
              <Button
                variant="outline"
                w="full"
                onClick={() => setShowForgotPassword(false)}
              >
                Back to Sign In
              </Button>
            </VStack>
          </VStack>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <Box
        bg="white"
        p={8}
        borderRadius="xl"
        boxShadow="lg"
        w="full"
        maxW="md"
      >
        <VStack spacing={6}>
          <Heading size="lg" color="gray.800">
            Welcome to ProjectKB
          </Heading>
          <Text color="gray.600" textAlign="center">
            Sign in to access your project knowledge bases
          </Text>
          
          {message && (
            <Alert status={message.type} borderRadius="md" w="full">
              <AlertIcon />
              {message.text}
            </Alert>
          )}
          
          <VStack spacing={4} w="full">
            <FormControl isInvalid={!!errors.username}>
              <FormLabel>Username</FormLabel>
              <Input
                data-testid="username-input"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Enter your username"
              />
              <FormErrorMessage>{errors.username}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <Input
                data-testid="password-input"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your password"
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>
            
            <Button
              data-testid="signin-button"
              w="full"
              bg="brand.500"
              color="white"
              _hover={{ bg: 'brand.600' }}
              size="lg"
              onClick={handleSignIn}
              isLoading={isLoading}
              loadingText="Signing In..."
            >
              Sign In
            </Button>
          </VStack>
          
          <HStack spacing={4} w="full">
            <Button
              data-testid="google-login-button"
              variant="outline"
              flex={1}
              leftIcon={<Icon as={FaGoogle} />}
              onClick={handleGoogleSignIn}
              isLoading={isLoading}
            >
              Google
            </Button>
            <Button
              data-testid="microsoft-login-button"
              variant="outline"
              flex={1}
              leftIcon={<Icon as={FaMicrosoft} />}
              onClick={handleMicrosoftSignIn}
              isLoading={isLoading}
            >
              Microsoft
            </Button>
          </HStack>
          
          <VStack spacing={2}>
            <Link 
              color="brand.500" 
              fontSize="sm"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot Password?
            </Link>
            <Text fontSize="sm" color="gray.500">
              Don't have an account?{' '}
              <Link color="brand.500" onClick={onSwitchToSignup}>
                Sign up
              </Link>
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
};
