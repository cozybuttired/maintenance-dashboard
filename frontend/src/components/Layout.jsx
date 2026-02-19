import React, { useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DRAWER_WIDTH = 250;
const APPBAR_HEIGHT = 64;

const Layout = ({
  children,
  user,
  selectedBranch,
  onBranchChange,
  availableBranches,
  activeItem,
  onNavigate,
  onLogout,
  appVersion
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  return (
    <Flex minH="100vh">
      {/* Sidebar */}
      <Box
        w={`${DRAWER_WIDTH}px`}
        bg="white"
        borderRight="1px"
        borderColor="gray.200"
        position="fixed"
        h="100vh"
        overflowY="auto"
      >
        <Sidebar
          activeItem={activeItem}
          onNavigate={onNavigate}
          user={user}
          onLogout={onLogout}
          appVersion={appVersion}
        />
      </Box>

      {/* Main content area */}
      <Box ml={`${DRAWER_WIDTH}px`} flex="1" bg="gray.50">
        {/* TopBar */}
        <TopBar
          user={user}
          onSearch={handleSearch}
          selectedBranch={selectedBranch}
          onBranchChange={onBranchChange}
          availableBranches={availableBranches}
          appVersion={appVersion}
        />

        {/* Page content */}
        <Box pt={`${APPBAR_HEIGHT + 24}px`} px={6} pb={6}>
          {children}
        </Box>
      </Box>
    </Flex>
  );
};

export default Layout;
