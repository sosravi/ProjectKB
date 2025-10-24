import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  ScrollArea,
  Avatar,
  Badge,
  Alert,
  AlertIcon,
  useToast,
  Spinner,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { CloseIcon, ArrowUpIcon } from '@chakra-ui/icons';
import { useAiAgent } from '../hooks/useAiAgent';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: string[];
}

interface AiChatInterfaceProps {
  pkbId: string;
  onClose: () => void;
}

export const AiChatInterface: React.FC<AiChatInterfaceProps> = ({
  pkbId,
  onClose,
}) => {
  const { queryContent, isLoading, error } = useAiAgent(pkbId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const response = await queryContent(inputValue.trim());
      
      const aiMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'ai',
        content: response.response,
        timestamp: new Date(),
        sources: response.sources,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Failed to get AI response:', err);
      
      const errorMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'ai',
        content: `Sorry, I encountered an error: ${err.message || 'Failed to process your request'}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'AI Query Failed',
        description: err.message || 'Failed to process your request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box
      w="full"
      h="600px"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <Flex
        p={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        align="center"
        bg="gray.50"
      >
        <Avatar size="sm" name="AI Assistant" bg="brand.500" />
        <VStack align="start" spacing={0} ml={3} flex={1}>
          <Text fontWeight="bold" fontSize="sm">
            AI Assistant
          </Text>
          <Text fontSize="xs" color="gray.500">
            Ask questions about your content
          </Text>
        </VStack>
        <IconButton
          aria-label="Close chat"
          icon={<CloseIcon />}
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </Flex>

      {/* Messages */}
      <Box flex={1} overflow="hidden">
        <ScrollArea ref={scrollAreaRef} h="full" p={4}>
          <VStack spacing={4} align="stretch">
            {messages.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500" fontSize="sm">
                  Start a conversation with your AI assistant
                </Text>
                <Text color="gray.400" fontSize="xs" mt={2}>
                  Ask questions about your project knowledge base
                </Text>
              </Box>
            ) : (
              messages.map((message) => (
                <Box
                  key={message.id}
                  alignSelf={message.type === 'user' ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                >
                  <HStack
                    spacing={3}
                    align="flex-start"
                    direction={message.type === 'user' ? 'row-reverse' : 'row'}
                  >
                    <Avatar
                      size="sm"
                      name={message.type === 'user' ? 'You' : 'AI Assistant'}
                      bg={message.type === 'user' ? 'gray.500' : 'brand.500'}
                    />
                    <VStack
                      align={message.type === 'user' ? 'flex-end' : 'flex-start'}
                      spacing={2}
                    >
                      <Box
                        bg={message.type === 'user' ? 'brand.500' : 'gray.100'}
                        color={message.type === 'user' ? 'white' : 'gray.800'}
                        px={4}
                        py={2}
                        borderRadius="lg"
                        fontSize="sm"
                      >
                        <Text whiteSpace="pre-wrap">{message.content}</Text>
                      </Box>
                      
                      {message.sources && message.sources.length > 0 && (
                        <VStack align="flex-start" spacing={1}>
                          <Text fontSize="xs" color="gray.500" fontWeight="medium">
                            Sources:
                          </Text>
                          <HStack spacing={1} wrap="wrap">
                            {message.sources.map((source, index) => (
                              <Badge
                                key={index}
                                colorScheme="blue"
                                variant="subtle"
                                fontSize="xs"
                              >
                                {source}
                              </Badge>
                            ))}
                          </HStack>
                        </VStack>
                      )}
                      
                      <Text fontSize="xs" color="gray.400">
                        {formatTimestamp(message.timestamp)}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              ))
            )}
            
            {isProcessing && (
              <Box alignSelf="flex-start" maxW="80%">
                <HStack spacing={3} align="flex-start">
                  <Avatar size="sm" name="AI Assistant" bg="brand.500" />
                  <Box
                    bg="gray.100"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontSize="sm"
                  >
                    <HStack spacing={2}>
                      <Spinner size="xs" color="brand.500" />
                      <Text color="gray.600">AI is thinking...</Text>
                    </HStack>
                  </Box>
                </HStack>
              </Box>
            )}
          </VStack>
        </ScrollArea>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert status="error" borderRadius="none">
          <AlertIcon />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}

      {/* Input */}
      <Box p={4} borderTop="1px solid" borderColor="gray.200" bg="white">
        <HStack spacing={2}>
          <Input
            placeholder="Ask about your content..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            isDisabled={isProcessing}
            size="sm"
          />
          <IconButton
            aria-label="Send message"
            icon={<ArrowUpIcon />}
            size="sm"
            colorScheme="brand"
            onClick={handleSendMessage}
            isLoading={isProcessing}
            isDisabled={!inputValue.trim()}
          />
        </HStack>
      </Box>
    </Box>
  );
};
