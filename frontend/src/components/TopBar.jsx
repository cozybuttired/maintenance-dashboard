import React from 'react';
import {
  Box,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  HStack,
} from '@chakra-ui/react';
import { FiSearch, FiUser } from 'react-icons/fi';

const DRAWER_WIDTH = 250;

const TopBar = ({ user, onSearch, selectedBranch, onBranchChange, availableBranches, appVersion }) => {
  const isDisabled = user?.role !== 'ADMIN' && user?.branch && user.branch !== 'ALL';

  return (
    <Flex
      position="fixed"
      top={0}
      left={`${DRAWER_WIDTH}px`}
      right={0}
      h="64px"
      bg="white"
      borderBottom="1px"
      borderColor="gray.200"
      align="center"
      px={6}
      zIndex={10}
    >
      <Flex flex="1" align="center" gap={6}>
        {/* Branch Tabs */}
        <HStack spacing={0} opacity={isDisabled ? 0.6 : 1} pointerEvents={isDisabled ? 'none' : 'auto'}>
          {availableBranches.map((branch) => {
            const isActive = selectedBranch === branch;
            return (
              <Box
                key={branch}
                px={4}
                py={2}
                cursor="pointer"
                position="relative"
                onClick={!isDisabled ? () => onBranchChange(branch) : undefined}
                color={isActive ? 'brand.500' : 'gray.500'}
                fontWeight={isActive ? 'semibold' : 'medium'}
                fontSize="sm"
                _hover={{ color: isActive ? 'brand.500' : 'gray.700' }}
                transition="color 0.2s"
              >
                {branch === 'ALL' ? 'All Branches' : branch}
                {isActive && (
                  <Box
                    position="absolute"
                    bottom={0}
                    left={0}
                    right={0}
                    h="2px"
                    bg="brand.500"
                  />
                )}
              </Box>
            );
          })}
        </HStack>

        {/* Separator */}
        <Box h="24px" w="1px" bg="gray.200" />

        {/* Search Bar */}
        <InputGroup w="280px" size="sm">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search maintenance records..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
            borderRadius="none"
          />
        </InputGroup>
      </Flex>

      <Flex align="center" gap={4}>
        {/* User Info */}
        <Flex
          align="center"
          gap={3}
          ml={2}
          pl={4}
          borderLeft="1px"
          borderColor="gray.200"
        >
          <Box textAlign="right">
            <Text fontSize="sm" fontWeight="medium">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text fontSize="xs" color="gray.500" textTransform="capitalize">
              {user?.role?.toLowerCase()} • {user?.branch}
            </Text>
          </Box>
          <Box color="brand.500">
            <FiUser size={28} />
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default TopBar;
