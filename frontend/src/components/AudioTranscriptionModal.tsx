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
  Divider,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon } from '@chakra-ui/icons';
import { useMultimediaAi } from '../hooks/useMultimediaAi.ts';

interface AudioTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioFile: File;
  pkbId: string;
}

export const AudioTranscriptionModal: React.FC<AudioTranscriptionModalProps> = ({
  isOpen,
  onClose,
  audioFile,
  pkbId,
}) => {
  const { transcribeAudio, isLoading, error } = useMultimediaAi(pkbId);
  const [transcription, setTranscription] = useState<any>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const toast = useToast();

  const validateAudioFile = (file: File): boolean => {
    const supportedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'];
    return supportedTypes.includes(file.type);
  };

  const handleTranscribe = async () => {
    if (!validateAudioFile(audioFile)) {
      toast({
        title: 'Unsupported File Type',
        description: 'Please select a valid audio file (MP3, WAV, MP4, OGG)',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsTranscribing(true);

    try {
      // For demo purposes, we'll use a mock content ID
      // In a real implementation, this would be the actual content ID
      const contentId = 'mock-content-id';
      const result = await transcribeAudio(contentId);
      setTranscription(result);
    } catch (err: any) {
      console.error('Audio transcription failed:', err);
      toast({
        title: 'Transcription Failed',
        description: err.message || 'Failed to transcribe audio',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatConfidence = (confidence: number) => {
    return Math.round(confidence * 100);
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        <ModalHeader>Transcribe Audio</ModalHeader>
        <ModalCloseButton isDisabled={isTranscribing} />
        
        <ModalBody>
          <VStack spacing={4}>
            {/* Audio File Info */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Audio File: {audioFile.name}
              </Text>
              <HStack spacing={4}>
                <Badge colorScheme="blue" variant="subtle">
                  {audioFile.type}
                </Badge>
                <Badge colorScheme="gray" variant="subtle">
                  {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                </Badge>
              </HStack>
            </Box>

            {/* File Validation */}
            {!validateAudioFile(audioFile) && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Unsupported file type. Please select a valid audio file (MP3, WAV, MP4, OGG).
                </Text>
              </Alert>
            )}

            {/* Transcription Results */}
            {transcription && (
              <VStack spacing={4} w="full" align="stretch">
                <Divider />
                
                {/* Transcript */}
                <Box>
                  <Text fontWeight="medium" mb={2}>
                    Transcript:
                  </Text>
                  <Text fontSize="sm" color="gray.700" bg="gray.50" p={3} borderRadius="md" whiteSpace="pre-wrap">
                    {transcription.transcript}
                  </Text>
                </Box>

                {/* Metadata */}
                <HStack spacing={4} wrap="wrap">
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      Confidence:
                    </Text>
                    <HStack spacing={2}>
                      <Progress
                        value={formatConfidence(transcription.confidence)}
                        colorScheme={getConfidenceColor(transcription.confidence)}
                        size="sm"
                        w="100px"
                      />
                      <Text fontSize="sm" fontWeight="medium">
                        {formatConfidence(transcription.confidence)}%
                      </Text>
                    </HStack>
                  </Box>
                  
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      Duration:
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {formatDuration(transcription.duration)}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      Language:
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {transcription.language}
                    </Text>
                  </Box>
                </HStack>

                {/* Speaker Identification */}
                {transcription.speakers && transcription.speakers.length > 0 && (
                  <Box>
                    <Text fontWeight="medium" mb={2}>
                      Speaker Identification:
                    </Text>
                    <VStack spacing={2} align="stretch">
                      {transcription.speakers.map((speaker: any, index: number) => (
                        <Box key={index} p={3} bg="gray.50" borderRadius="md">
                          <Text fontSize="sm" fontWeight="medium" color="blue.600">
                            {speaker.speaker}:
                          </Text>
                          <Text fontSize="sm" color="gray.700" mt={1}>
                            {speaker.text}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
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
            isDisabled={isTranscribing}
          >
            Close
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleTranscribe}
            isLoading={isTranscribing}
            loadingText="Transcribing..."
            isDisabled={!validateAudioFile(audioFile)}
          >
            Transcribe Audio
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
