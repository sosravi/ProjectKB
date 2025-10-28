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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
} from '@chakra-ui/react';
import { ArrowBackIcon, AddIcon, DeleteIcon, DownloadIcon, HamburgerIcon, ViewIcon, ChatIcon } from '@chakra-ui/icons';
import { usePkb } from '../hooks/usePkb.ts';
import { useContent } from '../hooks/useContent.ts';
import { FileUploadModal } from '../components/FileUploadModal.tsx';
import { AiChatInterface } from '../components/AiChatInterface.tsx';

export const PkbPage: React.FC = () => {
  const { pkbId } = useParams<{ pkbId: string }>();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isAiOpen, onOpen: onAiOpen, onClose: onAiClose } = useDisclosure();
  const { getPkbById, isLoading: isLoadingPkb } = usePkb();
  const { content, isLoading: isLoadingContent, error, deleteContent, getDownloadUrl, refreshContent } = useContent(pkbId || '');

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

  const handleDownloadContent = async (contentId: string, fileName: string) => {
    try {
      const downloadUrl = await getDownloadUrl(contentId);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  };

  const handleViewContent = async (contentId: string, fileName: string) => {
    try {
      const downloadUrl = await getDownloadUrl(contentId);
      // Open in new tab for viewing
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error('Failed to get view URL:', err);
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
          <HStack spacing={3}>
            <Button
              leftIcon={<ChatIcon />}
              bg="purple.500"
              color="white"
              _hover={{ bg: 'purple.600' }}
              onClick={onAiOpen}
            >
              Ask AI
            </Button>
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
          <Box bg="white" borderRadius="xl" boxShadow="sm" overflow="hidden">
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>File Name</Th>
                  <Th>Type</Th>
                  <Th>Size</Th>
                  <Th>Uploaded</Th>
                  <Th textAlign="center">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {content.map((item) => (
                  <Tr key={item.id} _hover={{ bg: 'gray.50' }}>
                    <Td fontWeight="medium">{item.fileName}</Td>
                    <Td color="gray.600">{item.fileType}</Td>
                    <Td color="gray.600">{formatFileSize(item.fileSize)}</Td>
                    <Td color="gray.500" fontSize="sm">{formatDate(item.uploadedAt)}</Td>
                    <Td>
                      <HStack justify="center" spacing={2}>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<HamburgerIcon />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem
                              icon={<ViewIcon />}
                              onClick={() => handleViewContent(item.id, item.fileName)}
                            >
                              View
                            </MenuItem>
                            <MenuItem
                              icon={<DownloadIcon />}
                              onClick={() => handleDownloadContent(item.id, item.fileName)}
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
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </VStack>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isOpen}
        onClose={onClose}
        pkbId={pkbId || ''}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* AI Chat Interface Modal */}
      <Modal isOpen={isAiOpen} onClose={onAiClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ask AI about your Knowledge Base</ModalHeader>
          <ModalCloseButton />
          <Box p={6}>
            <AiChatInterface
              pkbId={pkbId || ''}
              onClose={onAiClose}
            />
          </Box>
        </ModalContent>
      </Modal>
    </Box>
  );
};
