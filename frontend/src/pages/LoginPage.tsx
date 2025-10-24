import React from 'react';
import { Box, Flex, Heading, Text, Button, VStack, HStack } from '@chakra-ui/react';

export const LoginPage: React.FC = () => {
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
          
          <VStack spacing={4} w="full">
            <Box w="full">
              <Text fontSize="sm" color="gray.700" mb={2}>
                Username
              </Text>
              <Box
                as="input"
                data-testid="username-input"
                w="full"
                p={3}
                border="1px solid"
                borderColor="gray.300"
                borderRadius="md"
                placeholder="Enter your username"
                _focus={{
                  borderColor: 'brand.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                }}
              />
            </Box>
            
            <Box w="full">
              <Text fontSize="sm" color="gray.700" mb={2}>
                Password
              </Text>
              <Box
                as="input"
                data-testid="password-input"
                type="password"
                w="full"
                p={3}
                border="1px solid"
                borderColor="gray.300"
                borderRadius="md"
                placeholder="Enter your password"
                _focus={{
                  borderColor: 'brand.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                }}
              />
            </Box>
            
            <Button
              data-testid="signin-button"
              w="full"
              bg="brand.500"
              color="white"
              _hover={{ bg: 'brand.600' }}
              size="lg"
            >
              Sign In
            </Button>
          </VStack>
          
          <HStack spacing={4} w="full">
            <Button
              data-testid="google-login-button"
              variant="outline"
              flex={1}
              leftIcon={<Box>G</Box>}
            >
              Google
            </Button>
            <Button
              data-testid="microsoft-login-button"
              variant="outline"
              flex={1}
              leftIcon={<Box>M</Box>}
            >
              Microsoft
            </Button>
          </HStack>
          
          <Text fontSize="sm" color="gray.500">
            Don't have an account? <Text as="span" color="brand.500" cursor="pointer">Sign up</Text>
          </Text>
        </VStack>
      </Box>
    </Box>
  );
};
