import React, { useState, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Progress,
  Alert,
  AlertIcon,
  IconButton,
  useToast,
  Badge,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { CloseIcon, AddIcon } from '@chakra-ui/icons';
import { useContent } from '../hooks/useContent.ts';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkbId: string;
  onUploadSuccess?: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  pkbId,
  onUploadSuccess,
}) => {
  const { uploadFile: uploadFileFromHook, isLoading } = useContent(pkbId);
  const toast = useToast();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    // File type validation - allowed MIME types
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/markdown',
      'text/x-sh',
      'application/x-sh',
      'text/x-python',
      'application/javascript',
      'application/json',
      'text/json',
      'text/xml',
      'application/xml',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'audio/mpeg',
      'audio/wav',
    ];

    // Allowed file extensions (for files that might not have correct MIME types)
    const allowedExtensions = [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif',
      '.txt', '.md', '.markdown', '.sh', '.bash',
      '.py', '.js', '.ts', '.json', '.xml',
      '.doc', '.docx', '.mp4', '.mov', '.avi', '.mp3', '.wav',
      '.csv', '.xls', '.xlsx', '.ppt', '.pptx',
      '.zip', '.tar', '.gz',
    ];

    // Check MIME type or file extension
    const hasValidMimeType = allowedMimeTypes.includes(file.type);
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidMimeType && !hasValidExtension) {
      return `File type not supported: ${file.name}`;
    }

    // File size validation
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return 'File too large (max 100MB)';
    }

    return null;
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map(file => {
      const error = validateFile(file);
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: error ? 'error' : 'pending',
        error,
      };
    });

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    const validFiles = uploadFiles.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = validFiles.map(async (uploadFile) => {
        // Update status to uploading
        setUploadFiles(prev => 
          prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
        );

        try {
          await uploadFileFromHook(uploadFile.file, (progress) => {
            setUploadFiles(prev => 
              prev.map(f => f.id === uploadFile.id ? { ...f, progress } : f)
            );
          });

          // Update status to success
          setUploadFiles(prev => 
            prev.map(f => f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f)
          );
        } catch (error: any) {
          // Update status to error
          setUploadFiles(prev => 
            prev.map(f => f.id === uploadFile.id ? { 
              ...f, 
              status: 'error', 
              error: error.message || 'Upload failed' 
            } : f)
          );
        }
      });

      await Promise.all(uploadPromises);

      const successCount = uploadFiles.filter(f => f.status === 'success').length;
      const errorCount = uploadFiles.filter(f => f.status === 'error').length;

      if (successCount > 0) {
        toast({
          title: 'Upload Complete',
          description: `${successCount} file(s) uploaded successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }

      if (errorCount > 0) {
        toast({
          title: 'Upload Errors',
          description: `${errorCount} file(s) failed to upload`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploadFiles([]);
      onClose();
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'uploading': return 'blue';
      default: return 'gray';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Upload Files</ModalHeader>
        <ModalCloseButton isDisabled={isUploading} />
        
        <ModalBody>
          <VStack spacing={4}>
            {/* Drop Zone */}
            <Box
              data-testid="file-drop-zone"
              w="full"
              h="200px"
              border="2px dashed"
              borderColor="gray.300"
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={{ borderColor: 'brand.500' }}
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
            >
              <VStack spacing={2}>
                <AddIcon boxSize={8} color="gray.400" />
                <Text color="gray.600" textAlign="center">
                  Drag and drop files here
                </Text>
                <Text fontSize="sm" color="gray.400">
                  or click to select files
                </Text>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="file-input"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  Select Files
                </Button>
              </VStack>
            </Box>

            {/* File List */}
            {uploadFiles.length > 0 && (
              <VStack spacing={2} w="full" align="stretch">
                <Text fontWeight="medium">Files to Upload:</Text>
                {uploadFiles.map((uploadFile) => (
                  <Box
                    key={uploadFile.id}
                    p={3}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                  >
                    <Flex align="center">
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="medium">{uploadFile.file.name}</Text>
                        <HStack spacing={2}>
                          <Text fontSize="sm" color="gray.500">
                            {formatFileSize(uploadFile.file.size)}
                          </Text>
                          <Badge colorScheme={getStatusColor(uploadFile.status)}>
                            {uploadFile.status}
                          </Badge>
                        </HStack>
                        {uploadFile.error && (
                          <Text fontSize="sm" color="red.500">
                            {uploadFile.error}
                          </Text>
                        )}
                        {uploadFile.status === 'uploading' && (
                          <Progress
                            value={uploadFile.progress}
                            size="sm"
                            colorScheme="blue"
                            w="full"
                          />
                        )}
                      </VStack>
                      <Spacer />
                      <IconButton
                        aria-label="Remove file"
                        icon={<CloseIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(uploadFile.id)}
                        isDisabled={uploadFile.status === 'uploading'}
                      />
                    </Flex>
                  </Box>
                ))}
              </VStack>
            )}

            {/* Upload Instructions */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm">
                  Supported formats: PDF, Images (JPEG, PNG, GIF), Text, Markdown, Word docs, MP4, Audio
                </Text>
                <Text fontSize="sm">
                  Maximum file size: 100MB per file
                </Text>
              </VStack>
            </Alert>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            mr={3}
            onClick={handleClose}
            isDisabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            data-testid="upload-files-button"
            colorScheme="blue"
            onClick={handleUpload}
            isLoading={isUploading}
            loadingText="Uploading..."
            isDisabled={uploadFiles.filter(f => f.status === 'pending').length === 0}
          >
            Upload Files
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
