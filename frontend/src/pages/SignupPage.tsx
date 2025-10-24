import React, { useState } from 'react';
import { Box, Flex, Heading, Text, Button, VStack, HStack, Input, FormControl, FormLabel, FormErrorMessage, Alert, AlertIcon, Link } from '@chakra-ui/react';
import { Auth } from 'aws-amplify';

interface SignupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  givenName: string;
  familyName: string;
}

interface SignupPageProps {
  onSignupSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ 
  onSignupSuccess, 
  onSwitchToLogin 
}) => {
  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    givenName: '',
    familyName: ''
  });
  
  const [errors, setErrors] = useState<Partial<SignupFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Name validation
    if (!formData.givenName.trim()) {
      newErrors.givenName = 'First name is required';
    }
    if (!formData.familyName.trim()) {
      newErrors.familyName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await Auth.signUp({
        username: formData.username,
        password: formData.password,
        attributes: {
          email: formData.email,
          given_name: formData.givenName,
          family_name: formData.familyName
        }
      });

      setShowVerification(true);
      setMessage({
        type: 'success',
        text: 'Please check your email for verification code'
      });

      if (onSignupSuccess) {
        onSignupSuccess();
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred during signup'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (code: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      await Auth.confirmSignUp(formData.username, code);
      setMessage({
        type: 'success',
        text: 'Email verified successfully! You can now sign in.'
      });
      
      // Redirect to login after successful verification
      setTimeout(() => {
        if (onSwitchToLogin) {
          onSwitchToLogin();
        }
      }, 2000);
    } catch (error: any) {
      console.error('Verification error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Invalid verification code'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showVerification) {
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
              Verify Your Email
            </Heading>
            <Text color="gray.600" textAlign="center">
              We sent a verification code to {formData.email}
            </Text>
            
            <VStack spacing={4} w="full">
              <FormControl isInvalid={!!errors.username}>
                <FormLabel>Verification Code</FormLabel>
                <Input
                  data-testid="verification-code-input"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  onChange={(e) => {
                    const code = e.target.value.replace(/\D/g, '');
                    if (code.length === 6) {
                      handleVerification(code);
                    }
                  }}
                />
                <FormErrorMessage>{errors.username}</FormErrorMessage>
              </FormControl>
              
              {message && (
                <Alert status={message.type} borderRadius="md">
                  <AlertIcon />
                  {message.text}
                </Alert>
              )}
              
              <Button
                data-testid="resend-code-button"
                variant="outline"
                w="full"
                onClick={() => Auth.resendSignUpCode(formData.username)}
              >
                Resend Code
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
            Create Account
          </Heading>
          <Text color="gray.600" textAlign="center">
            Join ProjectKB to start organizing your project knowledge
          </Text>
          
          {message && (
            <Alert status={message.type} borderRadius="md" w="full">
              <AlertIcon />
              {message.text}
            </Alert>
          )}
          
          <VStack spacing={4} w="full">
            <HStack spacing={4} w="full">
              <FormControl isInvalid={!!errors.givenName}>
                <FormLabel>First Name</FormLabel>
                <Input
                  data-testid="first-name-input"
                  value={formData.givenName}
                  onChange={(e) => handleInputChange('givenName', e.target.value)}
                  placeholder="Enter your first name"
                />
                <FormErrorMessage>{errors.givenName}</FormErrorMessage>
              </FormControl>
              
              <FormControl isInvalid={!!errors.familyName}>
                <FormLabel>Last Name</FormLabel>
                <Input
                  data-testid="last-name-input"
                  value={formData.familyName}
                  onChange={(e) => handleInputChange('familyName', e.target.value)}
                  placeholder="Enter your last name"
                />
                <FormErrorMessage>{errors.familyName}</FormErrorMessage>
              </FormControl>
            </HStack>
            
            <FormControl isInvalid={!!errors.username}>
              <FormLabel>Username</FormLabel>
              <Input
                data-testid="username-input"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Choose a username"
              />
              <FormErrorMessage>{errors.username}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                data-testid="email-input"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <Input
                data-testid="password-input"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Create a password"
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                data-testid="confirm-password-input"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
              />
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            </FormControl>
            
            <Button
              data-testid="signup-button"
              w="full"
              bg="brand.500"
              color="white"
              _hover={{ bg: 'brand.600' }}
              size="lg"
              onClick={handleSignup}
              isLoading={isLoading}
              loadingText="Creating Account..."
            >
              Create Account
            </Button>
          </VStack>
          
          <Text fontSize="sm" color="gray.500">
            Already have an account?{' '}
            <Link color="brand.500" onClick={onSwitchToLogin}>
              Sign in
            </Link>
          </Text>
        </VStack>
      </Box>
    </Box>
  );
};
