import React from 'react';
import { Box, Heading, Text, Button, VStack, HStack, SimpleGrid } from '@chakra-ui/react';

export const DashboardPage: React.FC = () => {
  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Box>
            <Heading size="lg" color="gray.800">
              Project Knowledge Bases
            </Heading>
            <Text color="gray.600">
              Manage your project knowledge and collaborate with AI
            </Text>
          </Box>
          <Button
            data-testid="create-pkb-button"
            bg="brand.500"
            color="white"
            _hover={{ bg: 'brand.600' }}
            size="lg"
          >
            Create New PKB
          </Button>
        </HStack>
        
        <Box
          bg="white"
          p={6}
          borderRadius="xl"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.200"
        >
          <VStack spacing={4}>
            <Text color="gray.500" fontSize="lg">
              No project knowledge bases found
            </Text>
            <Text color="gray.400" textAlign="center">
              Create your first PKB to start organizing your project knowledge
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};
