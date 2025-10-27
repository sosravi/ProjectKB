import React, { useState } from 'react';
import { Box, Heading, Text, Button, VStack, HStack, Input, InputGroup, InputLeftElement, SimpleGrid, Spinner, Center, Alert, AlertIcon, useDisclosure } from '@chakra-ui/react';
import { SearchIcon, AddIcon } from '@chakra-ui/icons';
import { usePkb } from '../hooks/usePkb.ts';
import { CreatePkbModal } from '../components/CreatePkbModal.tsx';
import { PkbCard } from '../components/PkbCard.tsx';

export const DashboardPage: React.FC = () => {
  const { pkbs, isLoading, error, refreshPkbs } = usePkb();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPkbs, setFilteredPkbs] = useState(pkbs);

  // Filter PKBs based on search query
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPkbs(pkbs);
    } else {
      const filtered = pkbs.filter(pkb =>
        pkb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkb.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPkbs(filtered);
    }
  }, [pkbs, searchQuery]);

  const handleCreateSuccess = () => {
    refreshPkbs();
  };

  const handleRetry = () => {
    refreshPkbs();
  };

  if (isLoading && pkbs.length === 0) {
    return (
      <Center h="50vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="gray.500">Loading your PKBs...</Text>
        </VStack>
      </Center>
    );
  }

  if (error && pkbs.length === 0) {
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
              leftIcon={<AddIcon />}
              bg="brand.500"
              color="white"
              _hover={{ bg: 'brand.600' }}
              size="lg"
              onClick={onOpen}
            >
              Create New PKB
            </Button>
          </HStack>
          
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontWeight="medium">Failed to load PKBs</Text>
              <Text fontSize="sm">{error}</Text>
              <Button size="sm" colorScheme="red" variant="outline" onClick={handleRetry}>
                Retry
              </Button>
            </VStack>
          </Alert>
        </VStack>
      </Box>
    );
  }

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
            leftIcon={<AddIcon />}
            bg="brand.500"
            color="white"
            _hover={{ bg: 'brand.600' }}
            size="lg"
            onClick={onOpen}
          >
            Create New PKB
          </Button>
        </HStack>

        {pkbs.length > 0 && (
          <InputGroup maxW="md">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              data-testid="pkb-search-input"
              placeholder="Search PKBs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        )}

        {isLoading && pkbs.length > 0 && (
          <Center py={4}>
            <Spinner color="brand.500" />
          </Center>
        )}

        {filteredPkbs.length === 0 && !isLoading ? (
          <Box
            bg="white"
            p={8}
            borderRadius="xl"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.200"
            textAlign="center"
          >
            <VStack spacing={4}>
              <Text color="gray.500" fontSize="lg">
                {searchQuery ? 'No PKBs match your search' : 'No project knowledge bases found'}
              </Text>
              <Text color="gray.400">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Create your first PKB to start organizing your project knowledge'
                }
              </Text>
              {!searchQuery && (
                <Button
                  leftIcon={<AddIcon />}
                  bg="brand.500"
                  color="white"
                  _hover={{ bg: 'brand.600' }}
                  onClick={onOpen}
                >
                  Create Your First PKB
                </Button>
              )}
            </VStack>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filteredPkbs.map((pkb) => (
              <PkbCard
                key={pkb.id}
                pkb={pkb}
                onEdit={(pkb) => {
                  // TODO: Implement edit functionality
                  console.log('Edit PKB:', pkb);
                }}
                onDelete={(pkbId) => {
                  // PKB will be removed from list by usePkb hook
                  console.log('Delete PKB:', pkbId);
                }}
              />
            ))}
          </SimpleGrid>
        )}

        {searchQuery && filteredPkbs.length > 0 && (
          <Text color="gray.500" fontSize="sm" textAlign="center">
            Showing {filteredPkbs.length} of {pkbs.length} PKBs
          </Text>
        )}
      </VStack>

      <CreatePkbModal
        isOpen={isOpen}
        onClose={onClose}
        onCreateSuccess={handleCreateSuccess}
      />
    </Box>
  );
};
