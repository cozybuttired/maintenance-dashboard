import React from 'react';
import { Box, Text, VStack, Flex } from '@chakra-ui/react';
import { FiHome, FiBarChart2, FiUsers, FiLogOut } from 'react-icons/fi';

const Sidebar = ({ activeItem, onNavigate, user, onLogout, appVersion }) => {
  // Base menu items
  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
  ];

  // Admin-only menu items
  const adminMenuItems = [
    { id: 'users', label: 'User Management', icon: FiUsers },
  ];

  // Build menu based on user role
  const menuItems = [
    ...baseMenuItems,
    ...(user?.role === 'ADMIN' ? adminMenuItems : []),
  ];

  return (
    <Flex direction="column" h="full">
      {/* Header */}
      <Box p={5} borderBottom="1px" borderColor="gray.200">
        <Text fontSize="lg" fontWeight="bold" color="brand.500">
          Truda Foods
        </Text>
        <Text fontSize="xs" color="gray.500">
          Maintenance Dashboard
        </Text>
        <Text fontSize="9px" color="gray.500" fontWeight="500" mt={2}>
          v{appVersion}
        </Text>
      </Box>

      {/* Menu items */}
      <VStack spacing={1} align="stretch" mt={4} flex="1">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeItem === item.id;
          return (
            <Flex
              key={item.id}
              align="center"
              px={6}
              py={3}
              cursor="pointer"
              bg={isActive ? 'brand.50' : 'transparent'}
              color={isActive ? 'brand.600' : 'gray.700'}
              borderLeft={isActive ? '4px solid' : '4px solid transparent'}
              borderColor={isActive ? 'brand.500' : 'transparent'}
              _hover={{ bg: 'gray.100' }}
              onClick={() => onNavigate(item.id)}
            >
              <IconComponent size={18} />
              <Text ml={3} fontSize="sm" fontWeight="medium">
                {item.label}
              </Text>
            </Flex>
          );
        })}
      </VStack>

      {/* Logout */}
      <Box p={4} borderTop="1px" borderColor="gray.200">
        <Flex
          align="center"
          px={2}
          py={2}
          cursor="pointer"
          color="gray.500"
          _hover={{ color: 'red.600', bg: 'red.50' }}
          borderRadius="md"
          onClick={onLogout}
        >
          <FiLogOut size={18} />
          <Text ml={3} fontSize="sm" fontWeight="medium">
            Logout
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
};

export default Sidebar;
