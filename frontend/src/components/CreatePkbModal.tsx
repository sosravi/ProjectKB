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
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Textarea,
  VStack,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react';
import { usePkb, CreatePkbData } from '../hooks/usePkb';

interface CreatePkbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess?: () => void;
}

export const CreatePkbModal: React.FC<CreatePkbModalProps> = ({
  isOpen,
  onClose,
  onCreateSuccess,
}) => {
  const { createPkb, isLoading } = usePkb();
  const toast = useToast();
  
  const [formData, setFormData] = useState<CreatePkbData>({
    name: '',
    description: '',
  });
  
  const [errors, setErrors] = useState<Partial<CreatePkbData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<CreatePkbData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreatePkbData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await createPkb(formData);
      
      toast({
        title: 'PKB Created',
        description: 'Your project knowledge base has been created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form
      setFormData({ name: '', description: '' });
      setErrors({});
      
      // Close modal and call success callback
      onClose();
      if (onCreateSuccess) {
        onCreateSuccess();
      }
    } catch (error: any) {
      console.error('Failed to create PKB:', error);
      
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create PKB. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: '', description: '' });
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create Project Knowledge Base</ModalHeader>
        <ModalCloseButton isDisabled={isSubmitting} />
        
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isInvalid={!!errors.name}>
              <FormLabel>Name</FormLabel>
              <Input
                data-testid="pkb-name-input"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter PKB name"
                isDisabled={isSubmitting}
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.description}>
              <FormLabel>Description</FormLabel>
              <Textarea
                data-testid="pkb-description-input"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your project knowledge base"
                rows={4}
                resize="vertical"
                isDisabled={isSubmitting}
              />
              <FormErrorMessage>{errors.description}</FormErrorMessage>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            mr={3}
            onClick={handleClose}
            isDisabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            data-testid="create-pkb-submit"
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Creating..."
          >
            Create PKB
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
