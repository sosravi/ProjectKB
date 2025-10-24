import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  HStack,
  VStack,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  useToast,
  Badge,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, HamburgerIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { Pkb } from '../hooks/usePkb';
import { usePkb } from '../hooks/usePkb';

interface PkbCardProps {
  pkb: Pkb;
  onEdit?: (pkb: Pkb) => void;
  onDelete?: (pkbId: string) => void;
}

export const PkbCard: React.FC<PkbCardProps> = ({ pkb, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { deletePkb, isLoading } = usePkb();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCardClick = () => {
    navigate(`/pkb/${pkb.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(pkb);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);

    try {
      await deletePkb(pkb.id);
      
      toast({
        title: 'PKB Deleted',
        description: 'The project knowledge base has been deleted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      if (onDelete) {
        onDelete(pkb.id);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Failed to delete PKB:', error);
      
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete PKB. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Card
        cursor="pointer"
        _hover={{
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        }}
        transition="all 0.2s"
        onClick={handleCardClick}
      >
        <CardHeader pb={2}>
          <Flex align="center">
            <VStack align="start" spacing={1} flex={1}>
              <Heading size="md" color="gray.800">
                {pkb.name}
              </Heading>
              <Text fontSize="sm" color="gray.500">
                Created {formatDate(pkb.createdAt)}
              </Text>
            </VStack>
            <Spacer />
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<HamburgerIcon />}
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              />
              <MenuList>
                <MenuItem icon={<EditIcon />} onClick={handleEdit}>
                  Edit
                </MenuItem>
                <MenuItem icon={<DeleteIcon />} onClick={handleDeleteClick} color="red.500">
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </CardHeader>

        <CardBody pt={0}>
          <VStack align="start" spacing={3}>
            <Text color="gray.600" fontSize="sm" noOfLines={3}>
              {pkb.description}
            </Text>
            
            <HStack spacing={2} w="full">
              <Badge colorScheme="blue" variant="subtle">
                {pkb.contentCount || 0} items
              </Badge>
              <Spacer />
              <Text fontSize="xs" color="gray.400">
                Updated {formatDate(pkb.updatedAt)}
              </Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete PKB
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{pkb.name}"? This action cannot be undone.
              All content in this PKB will also be deleted.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} isDisabled={isDeleting}>
                Cancel
              </Button>
              <Button
                data-testid="confirm-delete-button"
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                isLoading={isDeleting}
                loadingText="Deleting..."
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
