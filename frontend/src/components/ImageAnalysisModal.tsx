import React, { useState } from 'react';
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
  Badge,
  useToast,
  Image,
  Divider,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon } from '@chakra-ui/icons';
import { useMultimediaAi } from '../hooks/useMultimediaAi.ts';

interface ImageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File;
  pkbId: string;
}

export const ImageAnalysisModal: React.FC<ImageAnalysisModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  pkbId,
}) => {
  const { analyzeImage, isLoading, error } = useMultimediaAi(pkbId);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const toast = useToast();

  const validateImageFile = (file: File): boolean => {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return supportedTypes.includes(file.type);
  };

  const handleAnalyze = async () => {
    if (!validateImageFile(imageFile)) {
      toast({
        title: 'Unsupported File Type',
        description: 'Please select a valid image file (JPEG, PNG, GIF, WebP)',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // For demo purposes, we'll use a mock content ID
      // In a real implementation, this would be the actual content ID
      const contentId = 'mock-content-id';
      const result = await analyzeImage(contentId);
      setAnalysis(result);
    } catch (err: any) {
      console.error('Image analysis failed:', err);
      toast({
        title: 'Analysis Failed',
        description: err.message || 'Failed to analyze image',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatConfidence = (confidence: number) => {
    return Math.round(confidence * 100);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'green';
    if (confidence >= 0.7) return 'yellow';
    return 'red';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Analyze Image</ModalHeader>
        <ModalCloseButton isDisabled={isAnalyzing} />
        
        <ModalBody>
          <VStack spacing={4}>
            {/* Image Preview */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Image: {imageFile.name}
              </Text>
              <Box
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                p={2}
                maxH="300px"
                overflow="hidden"
              >
                <Image
                  src={URL.createObjectURL(imageFile)}
                  alt={imageFile.name}
                  maxH="280px"
                  objectFit="contain"
                />
              </Box>
            </Box>

            {/* File Validation */}
            {!validateImageFile(imageFile) && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Unsupported file type. Please select a valid image file (JPEG, PNG, GIF, WebP).
                </Text>
              </Alert>
            )}

            {/* Analysis Results */}
            {analysis && (
              <VStack spacing={4} w="full" align="stretch">
                <Divider />
                
                {/* Description */}
                <Box>
                  <Text fontWeight="medium" mb={2}>
                    Description:
                  </Text>
                  <Text fontSize="sm" color="gray.700" bg="gray.50" p={3} borderRadius="md">
                    {analysis.description}
                  </Text>
                </Box>

                {/* Objects Detected */}
                {analysis.objects && analysis.objects.length > 0 && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Objects Detected:
                    </Text>
                    <HStack spacing={2} wrap="wrap">
                      {analysis.objects.map((object: string, index: number) => (
                        <Badge key={index} colorScheme="blue" variant="subtle">
                          {object}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Extracted Text */}
                {analysis.text && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Extracted Text:
                    </Text>
                    <Text fontSize="sm" color="gray.700" bg="gray.50" p={3} borderRadius="md" whiteSpace="pre-wrap">
                      {analysis.text}
                    </Text>
                  </Box>
                )}

                {/* Confidence Score */}
                <Box>
                  <Text fontWeight="medium" mb={2}>
                    Analysis Confidence:
                  </Text>
                  <HStack spacing={2}>
                    <Progress
                      value={formatConfidence(analysis.confidence)}
                      colorScheme={getConfidenceColor(analysis.confidence)}
                      size="sm"
                      flex={1}
                    />
                    <Text fontSize="sm" fontWeight="medium">
                      {formatConfidence(analysis.confidence)}%
                    </Text>
                  </HStack>
                </Box>

                {/* Suggestions */}
                {analysis.suggestions && analysis.suggestions.length > 0 && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Suggestions:
                    </Text>
                    <List spacing={1}>
                      {analysis.suggestions.map((suggestion: string, index: number) => (
                        <ListItem key={index} fontSize="sm">
                          <ListIcon as={CheckIcon} color="green.500" />
                          {suggestion}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </VStack>
            )}

            {/* Error Display */}
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{error}</Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            mr={3}
            onClick={onClose}
            isDisabled={isAnalyzing}
          >
            Close
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleAnalyze}
            isLoading={isAnalyzing}
            loadingText="Analyzing..."
            isDisabled={!validateImageFile(imageFile)}
          >
            Analyze Image
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
