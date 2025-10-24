import React from 'react';
import { Box, Flex, Heading, Button, HStack, Spacer } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" borderBottom="1px solid" borderColor="gray.200" px={6} py={4}>
        <Flex align="center" justify="space-between">
          <Heading size="md" color="brand.500">
            ProjectKB
          </Heading>
          <HStack spacing={4}>
            <Button variant="ghost" size="sm">
              Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box>
        {children}
      </Box>
    </Box>
  );
};
