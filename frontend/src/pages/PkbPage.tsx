import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { ArrowBackIcon, AddIcon, DeleteIcon, DownloadIcon, HamburgerIcon } from '@chakra-ui/icons';
import { usePkb } from '../hooks/usePkb.ts';
import { useContent } from '../hooks/useContent.ts';
import { FileUploadModal } from '../components/FileUploadModal.tsx';

export const PkbPage: React.FC = () => {
  const { pkbId } = useParams<{ pkbId: string }>();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { getPkbById, isLoading: isLoadingPkb } = usePkb();
  const { content, isLoading: isLoadingContent, error, deleteContent, refreshContent } = useContent(pkbId || '');

  const pkb = getPkbById(pkbId || '');

  if (isLoadingPkb) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  if (!pkb) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          PKB not found
        </Alert>
      </Box>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDeleteContent = async (contentId: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteContent(contentId);
        // Content is automatically removed from state by useContent hook
      } catch (err) {
        console.error('Failed to delete content:', err);
      }
    }
  };

  const handleUploadSuccess = () => {
    refreshContent();
    onClose();
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={4}>
            <IconButton
              aria-label="Go back"
              icon={<ArrowBackIcon />}
              onClick={() => navigate('/dashboard')}
              variant="ghost"
            />
            <Box>
              <Heading color="gray.800" size="lg">
                {pkb.name}
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Created {formatDate(pkb.createdAt)}
              </Text>
            </Box>
          </HStack>
          <Button
            leftIcon={<AddIcon />}
            bg="brand.500"
            color="white"
            _hover={{ bg: 'brand.600' }}
            onClick={onOpen}
          >
            Add File
          </Button>
        </HStack>

        {/* Description */}
        <Text color="gray.600" fontSize="md">
          {pkb.description}
        </Text>

        {/* Content Count */}
        <HStack>
          <Badge colorScheme="blue" variant="subtle" fontSize="md" px={3} py={1}>
            {content.length} {content.length === 1 ? 'item' : 'items'}
          </Badge>
          <Text fontSize="sm" color="gray.500">
            Last updated: {formatDate(pkb.updatedAt)}
          </Text>
        </HStack>

        {/* Content List */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {isLoadingContent ? (
          <Center py={12}>
            <Spinner size="xl" color="brand.500" />
          </Center>
        ) : content.length === 0 ? (
          <Box
            bg="white"
            p={12}
            borderRadius="xl"
            boxShadow="sm"
            border="1px dashed"
            borderColor="gray.300"
            textAlign="center"
          >
            <VStack spacing={4}>
              <Text color="gray.500" fontSize="lg">
                No content yet
              </Text>
              <Text color="gray.400">
                Add files to start building your knowledge base
              </Text>
              <Button
                leftIcon={<AddIcon />}
                bg="brand.500"
                color="white"
                _hover={{ bg: 'brand.600' }}
                onClick={onOpen}
              >
                Add Your First File
              </Button>
            </VStack>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {content.map((item) => (
              <Card key={item.id} variant="outline" size="sm">
                <CardHeader pb={2}>
                  <Flex align="center">
                    <Box flex={1}>
                      <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                        {item.fileName}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatFileSize(item.fileSize)}
                      </Text>
                    </Box>
                    <Spacer />
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<HamburgerIcon />}
                        variant="ghost"
                        size="xs"
                      />
                      <MenuList>
                        <MenuItem
                          icon={<DownloadIcon />}
                          onClick={() => {
                            // TODO: Implement download
                            console.log('Download:', item.id);
                          }}
                        >
                          Download
                        </MenuItem>
                        <MenuItem
                          icon={<DeleteIcon />}
                          onClick={() => handleDeleteContent(item.id)}
                          color="red.500"
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack align="start" spacing={2}>
                    <Badge colorScheme="gray" variant="subtle" fontSize="xx-small">
                      {item.fileType}
                    </Badge>
                    <Text fontSize="xx-small" color="gray.400">
                      Uploaded {formatDate(item.uploadedAt)}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </VStack>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isOpen}
        onClose={onClose}
        pkbId={pkbId || ''}
        onUploadSuccess={handleUploadSuccess}
      />
    </Box>
  );
};
