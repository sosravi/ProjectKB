import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';

export const PkbPage: React.FC = () => {
  return (
    <Box p={6}>
      <Heading size="lg" color="gray.800" mb={4}>
        PKB Details
      </Heading>
      <Text color="gray.600">
        PKB content and management interface will be implemented in Sprint 3.
      </Text>
    </Box>
  );
};

