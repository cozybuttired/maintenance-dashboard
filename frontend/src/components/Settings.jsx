import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  Select,
  Switch,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  Heading,
  Divider,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Spinner,
  Flex,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiUser, FiMonitor, FiEye, FiEyeOff } from 'react-icons/fi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const Settings = ({ user }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  // User Profile State
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Display Preferences State
  const [displayPrefs, setDisplayPrefs] = useState({
    theme: 'light',
    defaultDateRange: 'ytd',
    currencyFormat: 'ZAR',
    compactNumbers: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/settings`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }

        const data = await response.json();
        const fetchedSettings = data.settings || [];

        const initialDisplayPrefs = { ...displayPrefs };

        fetchedSettings.forEach(setting => {
          if (Object.keys(initialDisplayPrefs).includes(setting.key)) {
            initialDisplayPrefs[setting.key] = setting.value === 'true' ? true : (setting.value === 'false' ? false : setting.value);
          }
        });

        setDisplayPrefs(initialDisplayPrefs);

      } catch (err) {
        toast({
          title: 'Error loading settings',
          description: err.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'ADMIN') {
      fetchSettings();
    }
  }, [user, toast]);

  // Admin check
  if (user?.role !== 'ADMIN') {
    return (
      <Alert status="error" borderRadius="none">
        <AlertIcon />
        Access denied. Admin privileges required.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  // Profile handlers
  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: 'Profile updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error updating profile',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate password strength: 8+ chars, at least 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      toast({
        title: 'Weak password',
        description: 'Password must be 8+ characters with uppercase, lowercase, and number',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setSavingPassword(true);
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500));

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: 'Password changed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error changing password',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Display preferences handlers
  const handleDisplayChange = async (field, value) => {
    const newPrefs = { ...displayPrefs, [field]: value };
    setDisplayPrefs(newPrefs);

    try {
      await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: Object.keys(newPrefs).map(key => ({ key, value: String(newPrefs[key]) })) })
      });

      toast({
        title: 'Display preferences updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'bottom-right'
      });
    } catch (err) {
      console.error('Error saving display preferences:', err);
      toast({
        title: 'Error saving display preferences',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <Heading size="lg" fontWeight="semibold" mb={6}>Settings</Heading>

      <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none">
        <Tabs variant="enclosed" colorScheme="brand">
          <TabList borderBottom="1px" borderColor="gray.200" px={4} pt={4}>
            <Tab borderRadius="none" _selected={{ bg: 'white', borderColor: 'gray.200', borderBottom: 'none', mb: '-1px' }}>
              <HStack spacing={2}>
                <FiUser />
                <Text>Profile</Text>
              </HStack>
            </Tab>
            <Tab borderRadius="none" _selected={{ bg: 'white', borderColor: 'gray.200', borderBottom: 'none', mb: '-1px' }}>
              <HStack spacing={2}>
                <FiMonitor />
                <Text>Display</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Profile Tab */}
            <TabPanel p={6}>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Text fontSize="md" fontWeight="medium" mb={4}>Personal Information</Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>First Name</FormLabel>
                      <Input
                        value={profileData.firstName}
                        onChange={(e) => handleProfileChange('firstName', e.target.value)}
                        borderRadius="none"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Last Name</FormLabel>
                      <Input
                        value={profileData.lastName}
                        onChange={(e) => handleProfileChange('lastName', e.target.value)}
                        borderRadius="none"
                      />
                    </FormControl>
                  </SimpleGrid>
                  <FormControl mt={4}>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      borderRadius="none"
                    />
                  </FormControl>
                  <Button
                    mt={4}
                    colorScheme="brand"
                    onClick={handleSaveProfile}
                    isLoading={savingProfile}
                    borderRadius="none"
                  >
                    Save Profile
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Text fontSize="md" fontWeight="medium" mb={4}>Change Password</Text>
                  <VStack spacing={4} align="stretch" maxW="400px">
                    <FormControl>
                      <FormLabel>Current Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                          borderRadius="none"
                        />
                        <InputRightElement>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            icon={showPasswords.current ? <FiEyeOff /> : <FiEye />}
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                            aria-label="Toggle password visibility"
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                    <FormControl>
                      <FormLabel>New Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                          borderRadius="none"
                        />
                        <InputRightElement>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            icon={showPasswords.new ? <FiEyeOff /> : <FiEye />}
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                            aria-label="Toggle password visibility"
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Confirm New Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                          borderRadius="none"
                        />
                        <InputRightElement>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            icon={showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                            aria-label="Toggle password visibility"
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                    <Button
                      colorScheme="brand"
                      onClick={handleChangePassword}
                      isLoading={savingPassword}
                      borderRadius="none"
                      isDisabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    >
                      Change Password
                    </Button>
                  </VStack>
                </Box>

              </VStack>
            </TabPanel>

            {/* Display Tab */}
            <TabPanel p={6}>
              <VStack spacing={6} align="stretch">
                <Text fontSize="md" fontWeight="medium">Display Preferences</Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <FormControl>
                    <FormLabel>Theme</FormLabel>
                    <Select
                      value={displayPrefs.theme}
                      onChange={(e) => handleDisplayChange('theme', e.target.value)}
                      borderRadius="none"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark (Coming Soon)</option>
                      <option value="system">System Default</option>
                    </Select>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Choose your preferred color theme
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Default Date Range</FormLabel>
                    <Select
                      value={displayPrefs.defaultDateRange}
                      onChange={(e) => handleDisplayChange('defaultDateRange', e.target.value)}
                      borderRadius="none"
                    >
                      <option value="ytd">Year to Date</option>
                      <option value="mtd">Month to Date</option>
                      <option value="qtd">Quarter to Date</option>
                      <option value="last12">Last 12 Months</option>
                    </Select>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Default date range when opening the dashboard
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      value={displayPrefs.currencyFormat}
                      borderRadius="none"
                      isDisabled
                    >
                      <option value="ZAR">South African Rand (R)</option>
                    </Select>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      The currency is currently fixed to South African Rand.
                    </Text>
                  </FormControl>

                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <FormLabel mb="0">Compact Numbers</FormLabel>
                      <Text fontSize="xs" color="gray.500">
                        Show 50K instead of 50,000
                      </Text>
                    </Box>
                    <Switch
                      isChecked={displayPrefs.compactNumbers}
                      onChange={(e) => handleDisplayChange('compactNumbers', e.target.checked)}
                      colorScheme="brand"
                    />
                  </FormControl>
                </SimpleGrid>

                <Text fontSize="xs" color="gray.500" mt={4}>
                  Display preferences are saved automatically
                </Text>
              </VStack>
            </TabPanel>

          </TabPanels>
        </Tabs>
      </Card>
    </Box>
  );
};

export default Settings;