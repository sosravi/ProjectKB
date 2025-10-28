import React from 'react';
import { Tooltip, Box, Icon } from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

interface VersionTooltipProps {
  version?: string;
}

export const VersionTooltip: React.FC<VersionTooltipProps> = ({ 
  version = process.env.REACT_APP_VERSION || 'v1.0.0' 
}) => {
  return (
    <Box
      position="fixed"
      bottom="4"
      right="4"
      zIndex={1000}
    >
      <Tooltip
        label={`ProjectKB ${version}`}
        placement="top"
        hasArrow
        bg="gray.800"
        color="white"
        fontSize="sm"
        px={3}
        py={2}
        borderRadius="md"
        boxShadow="lg"
      >
        <Box
          data-testid="version-tooltip"
          cursor="pointer"
          p={2}
          borderRadius="full"
          bg="gray.100"
          _hover={{
            bg: 'gray.200',
            transform: 'scale(1.05)',
          }}
          transition="all 0.2s"
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="8"
          h="8"
        >
          <Icon as={InfoIcon} w={4} h={4} color="gray.600" />
        </Box>
      </Tooltip>
    </Box>
  );
};


