import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  Text,
  Flex,
  Badge,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Switch,
  VStack,
  HStack,
  SimpleGrid,
  Alert,
  AlertIcon,
  useDisclosure,
  useToast,
  Checkbox,
  CheckboxGroup,
  Wrap,
  WrapItem,
  Spinner,
  Heading,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiUserX, FiUsers, FiTrash, FiInfo } from 'react-icons/fi'; // Added FiUsers, FiTrash, FiInfo
import { formatCostCode } from '../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const BRANCHES = ['ALL', 'PMB', 'PTA', 'QTN', 'CPT'];
const ROLES = ['ADMIN', 'User'];

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [costCodes, setCostCodes] = useState([]); // Live cost codes from database
  const [groups, setGroups] = useState([]); // Available groups
  const [selectedGroup, setSelectedGroup] = useState(null); // Selected group in form
  const [costCodesForGroup, setCostCodesForGroup] = useState([]); // Cost codes for selected group
  const [loading, setLoading] = useState(true);
  const [loadingCostCodes, setLoadingCostCodes] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingGroupCostCodes, setLoadingGroupCostCodes] = useState(false); // Loading cost codes for selected group
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [userTypeCostCodesConfig, setUserTypeCostCodesConfig] = useState([]); // State for user type cost codes config

  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [userToDelete, setUserToDelete] = useState(null);
  const toast = useToast();

  // User Type Management Modals (Moved from Settings.jsx)
  const { isOpen: isManageUserTypesOpen, onOpen: onManageUserTypesOpen, onClose: onManageUserTypesClose } = useDisclosure(); // For the main management modal
  const { isOpen: isAddUserTypeOpen, onOpen: onAddUserTypeOpen, onClose: onAddUserTypeClose } = useDisclosure();
  const { isOpen: isEditUserTypeOpen, onOpen: onEditUserTypeOpen, onClose: onEditUserTypeClose } = useDisclosure();
  const { isOpen: isDeleteUserTypeOpen, onOpen: onDeleteUserTypeOpen, onClose: onDeleteUserTypeClose } = useDisclosure();
  const [userTypeFormData, setUserTypeFormData] = useState({
    name: '',
    role: 'User',
    branch: 'PMB',
    assignedGroups: [],
    costCodes: []
  });
  const [editingUserType, setEditingUserType] = useState(null); // Stores the user type being edited
  const [deletingUserType, setDeletingUserType] = useState(null); // Stores the user type being deleted
  const [savingUserTypes, setSavingUserTypes] = useState(false); // New saving state for user types
  const [userTypeSearchTerm, setUserTypeSearchTerm] = useState(''); // Search term for user types
  const [costCodeSearchTerm, setCostCodeSearchTerm] = useState(''); // Search term for cost codes

  // Admin check
  if (user?.role !== 'ADMIN') {
    return (
      <Alert status="error" borderRadius="none">
        <AlertIcon />
        Access denied. Admin privileges required.
      </Alert>
    );
  }

  // Helper to fetch both users and user type configurations
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersResponse = await fetch(`${API_BASE_URL}/users`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }
      const usersData = await usersResponse.json();
      setUsers(usersData.users || []);

      // Fetch user types from new UserType table (instead of settings)
      const userTypesResponse = await fetch(`${API_BASE_URL}/user-types`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!userTypesResponse.ok) {
        throw new Error('Failed to fetch user types');
      }
      const userTypesData = await userTypesResponse.json();
      setUserTypeCostCodesConfig(userTypesData.userTypes || []);

      // Fetch live cost codes and groups from database
      await fetchCostCodes();
      await fetchGroups();

      setError(null);
    } catch (err) {
      setError('Failed to load user data or configurations');
      if (process.env.NODE_ENV !== 'production') console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available groups from database
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch(`${API_BASE_URL}/groups`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setGroups(data.groups || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch live cost codes from database
  const fetchCostCodes = async () => {
    setLoadingCostCodes(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cost-codes`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cost codes');
      }

      const data = await response.json();
      setCostCodes(data.costCodes || []);
    } catch (err) {
      console.error('Error fetching cost codes:', err);
      setCostCodes([]);
    } finally {
      setLoadingCostCodes(false);
    }
  };

  // Fetch cost codes for a specific group
  const fetchCostCodesForGroup = async (group) => {
    setLoadingGroupCostCodes(true);
    try {
      const encodedGroup = encodeURIComponent(group);
      const response = await fetch(`${API_BASE_URL}/cost-codes/by-group/${encodedGroup}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cost codes for group');
      }

      const data = await response.json();
      setCostCodesForGroup(data.costCodes || []);
    } catch (err) {
      console.error('Error fetching cost codes for group:', err);
      setCostCodesForGroup([]);
    } finally {
      setLoadingGroupCostCodes(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [toast]);

  const handleEditClick = (userToEdit) => {
    setEditingUser(userToEdit);
    setSelectedGroup(null); // Reset group filter
    setCostCodesForGroup(costCodes); // Show all codes by default
    const assignedCodes = userToEdit.assignedCostCodes
      ? (typeof userToEdit.assignedCostCodes === 'string'
          ? JSON.parse(userToEdit.assignedCostCodes)
          : userToEdit.assignedCostCodes)
      : [];
    const assignedGroups = userToEdit.assignedGroups
      ? (typeof userToEdit.assignedGroups === 'string'
          ? JSON.parse(userToEdit.assignedGroups)
          : userToEdit.assignedGroups)
      : [];
    setFormData({
      firstName: userToEdit.firstName,
      lastName: userToEdit.lastName,
      email: userToEdit.email,
      role: userToEdit.role,
      branch: userToEdit.branch,
      isActive: userToEdit.isActive,
      assignedGroups: assignedGroups,
      assignedCostCodes: assignedCodes,
      // Initialize userType for editing, if available
      userType: userTypeCostCodesConfig.find(type =>
        JSON.stringify(type.costCodes.sort()) === JSON.stringify(assignedCodes.sort())
      )?.name || ''
    });
    onEditOpen();
  };

  const handleAddClick = () => {
    setSelectedGroup(null); // Reset group filter
    setCostCodesForGroup(costCodes); // Show all codes by default
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: '',
      branch: '',
      assignedGroups: [],
      assignedCostCodes: [],
      userType: '' // Initialize for add
    });
    onAddOpen();
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    onDeleteOpen();
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          isActive: formData.isActive
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      toast({
        title: 'User updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onEditClose();
      fetchData(); // Refresh all data
    } catch (err) {
      toast({
        title: 'Error updating user',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    try {
      setSaving(true);
      // Exclude password from request (auto-generated as Truda123)
      const { password, ...userDataWithoutPassword } = formData;

      // Security: If no specific cost codes selected, set to null for group-level access
      // If specific codes selected, send them for strict control
      const assignedCostCodes = formData.assignedCostCodes && formData.assignedCostCodes.length > 0
        ? formData.assignedCostCodes
        : null;

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...userDataWithoutPassword,
          assignedCostCodes: assignedCostCodes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      toast({
        title: 'User created successfully! 🎉',
        description: 'User can now login with their username and password "Truda123". They will be prompted to create their own password on first login.',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });

      onAddClose();
      fetchData(); // Refresh all data
    } catch (err) {
      toast({
        title: 'Error creating user',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/users/${userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toast({
        title: 'User deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onDeleteClose();
      fetchData(); // Refresh all data
    } catch (err) {
      toast({
        title: 'Error deleting user',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCostCodeChange = (codes) => {
    setFormData(prev => ({ ...prev, assignedCostCodes: codes }));
  };

  const handleGroupChange = async (group) => {
    setSelectedGroup(group);
    if (group) {
      // Fetch cost codes for the selected group
      await fetchCostCodesForGroup(group);
    } else {
      // If no group selected, show all cost codes
      setCostCodesForGroup(costCodes);
    }
  };

  const handleUserTypeChange = (selectedTypeName) => {
    const selectedType = userTypeCostCodesConfig.find(type => type.name === selectedTypeName);
    if (selectedType) {
      // Auto-fill role, branch, groups, and cost codes from the selected user type
      setFormData(prev => ({
        ...prev,
        userType: selectedTypeName,
        role: selectedType.role || 'User',
        branch: selectedType.branch || 'PMB',
        assignedGroups: selectedType.assignedGroups || [],
        assignedCostCodes: selectedType.costCodes || []
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        userType: '',
        assignedCostCodes: []
      }));
    }
  };

  // User Type Management functions - now using dedicated UserType endpoints
  const createUserType = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-types`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user type');
      }

      const data = await response.json();
      return { success: true, userType: data.userType };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateUserType = async (id, userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-types/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user type');
      }

      const data = await response.json();
      return { success: true, userType: data.userType };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteUserType = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-types/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user type');
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const handleAddUserType = async () => {
    if (!userTypeFormData.name.trim()) {
      toast({
        title: 'User Type Name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSavingUserTypes(true);
    const result = await createUserType({
      name: userTypeFormData.name.trim(),
      role: userTypeFormData.role,
      branch: userTypeFormData.branch,
      assignedGroups: userTypeFormData.assignedGroups,
      costCodes: userTypeFormData.costCodes
    });

    if (result.success) {
      toast({
        title: 'User type created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onAddUserTypeClose();
      setUserTypeFormData({ name: '', role: 'User', branch: 'PMB', assignedGroups: [], costCodes: [] });
      setCostCodeSearchTerm('');
      await fetchData(); // Refresh user types list
    } else {
      toast({
        title: 'Error creating user type',
        description: result.error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setSavingUserTypes(false);
  };

  const handleEditUserType = async () => {
    if (!userTypeFormData.name.trim()) {
      toast({
        title: 'User Type Name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSavingUserTypes(true);
    const result = await updateUserType(editingUserType.id, {
      name: userTypeFormData.name.trim(),
      role: userTypeFormData.role,
      branch: userTypeFormData.branch,
      assignedGroups: userTypeFormData.assignedGroups,
      costCodes: userTypeFormData.costCodes
    });

    if (result.success) {
      toast({
        title: 'User type updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onEditUserTypeClose();
      setEditingUserType(null);
      setUserTypeFormData({ name: '', role: 'User', branch: 'PMB', assignedGroups: [], costCodes: [] });
      setCostCodeSearchTerm('');
      await fetchData(); // Refresh user types list
    } else {
      toast({
        title: 'Error updating user type',
        description: result.error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setSavingUserTypes(false);
  };

  const handleDeleteUserType = async () => {
    if (!deletingUserType) return;

    setSavingUserTypes(true);
    const result = await deleteUserType(deletingUserType.id);

    if (result.success) {
      toast({
        title: 'User type deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteUserTypeClose();
      setDeletingUserType(null);
      await fetchData(); // Refresh user types list
    } else {
      toast({
        title: 'Error deleting user type',
        description: result.error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setSavingUserTypes(false);
  };


  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" fontWeight="semibold">User Management</Heading>
        <HStack>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="brand"
            onClick={handleAddClick}
            borderRadius="none"
          >
            Add User
          </Button>
          <Button
            leftIcon={<FiUsers />}
            colorScheme="blue" // Different color to distinguish
            onClick={onManageUserTypesOpen} // Opens the modal for managing user types
            borderRadius="none"
          >
            Manage User Types
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Alert status="error" mb={4} borderRadius="none">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none">
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th bg="gray.50">Username</Th>
                <Th bg="gray.50">Name</Th>
                <Th bg="gray.50">Email</Th>
                <Th bg="gray.50">Role</Th>
                <Th bg="gray.50">Branch</Th>
                <Th bg="gray.50">Status</Th>
                <Th bg="gray.50">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((u) => (
                <Tr key={u.id} _hover={{ bg: 'gray.50' }}>
                  <Td fontWeight="medium">{u.username}</Td>
                  <Td>{u.firstName} {u.lastName}</Td>
                  <Td color="gray.600">{u.email}</Td>
                  <Td>
                    <Badge
                      colorScheme={u.role === 'ADMIN' ? 'purple' : 'blue'}
                      borderRadius="full"
                      px={2}
                    >
                      {u.role}
                    </Badge>
                  </Td>
                  <Td>{u.branch}</Td>
                  <Td>
                    <Badge
                      colorScheme={u.isActive ? 'green' : 'red'}
                      borderRadius="full"
                      px={2}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<FiEdit2 />}
                      aria-label="Edit user"
                      onClick={() => handleEditClick(u)}
                    />
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<FiUserX />}
                      aria-label="Delete user"
                      onClick={() => handleDeleteClick(u)}
                      ml={2}
                      color="red.500"
                      isDisabled={u.id === user.id}
                      title={u.id === user.id ? "You cannot delete your own account" : "Delete user"}
                      opacity={u.id === user.id ? 0.5 : 1}
                    />
                  </Td>
                </Tr>
              ))}
              {users.length === 0 && (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8} color="gray.500">
                    No users found
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Card>

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="none">
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info" borderRadius="none" mb={2}>
                <AlertIcon />
                <Box>
                  <Text fontSize="sm">To edit user groups and cost codes, edit the <strong>User Type</strong> in Manage User Types. All users of that type will be updated automatically.</Text>
                </Box>
              </Alert>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    borderRadius="none"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    borderRadius="none"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  borderRadius="none"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Active</FormLabel>
                <Switch
                  isChecked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>

              <Box borderTop="1px" borderColor="gray.200" pt={4}>
                <Text fontSize="sm" fontWeight="medium" mb={3}>User Permissions (Read-only)</Text>

                <SimpleGrid columns={2} spacing={4} mb={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Role</Text>
                    <Badge colorScheme={formData.role === 'ADMIN' ? 'purple' : 'blue'} borderRadius="full">
                      {formData.role}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Branch</Text>
                    <Badge colorScheme="gray" borderRadius="full">
                      {formData.branch}
                    </Badge>
                  </Box>
                </SimpleGrid>

                <FormControl mb={4}>
                  <FormLabel fontSize="sm">Assigned Groups</FormLabel>
                  <Box border="1px" borderColor="gray.200" p={2} borderRadius="md" bg="gray.50" minH="40px">
                    {formData.assignedGroups && formData.assignedGroups.length > 0 ? (
                      <Wrap spacing={2}>
                        {formData.assignedGroups.map(group => (
                          <Badge key={group} colorScheme="blue" borderRadius="full">
                            {group}
                          </Badge>
                        ))}
                      </Wrap>
                    ) : (
                      <Text fontSize="sm" color="gray.500">All groups</Text>
                    )}
                  </Box>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Assigned Cost Codes</FormLabel>
                  <Box
                    border="1px"
                    borderColor="gray.200"
                    p={2}
                    borderRadius="md"
                    bg="gray.50"
                    maxH="150px"
                    overflowY="auto"
                    minH="40px"
                  >
                    {formData.assignedCostCodes && formData.assignedCostCodes.length > 0 ? (
                      <Wrap spacing={2}>
                        {formData.assignedCostCodes.map(code => (
                          <Badge key={code} colorScheme="green" borderRadius="full" fontSize="xs">
                            {code}
                          </Badge>
                        ))}
                      </Wrap>
                    ) : (
                      <Text fontSize="sm" color="gray.500">All cost codes in assigned groups</Text>
                    )}
                  </Box>
                </FormControl>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose} borderRadius="none">
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleSaveEdit}
              isLoading={saving}
              borderRadius="none"
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add User Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="none">
          <ModalHeader>Add New User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={2} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Username</FormLabel>
                  <Input
                    value={formData.username || ''}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    borderRadius="none"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    borderRadius="none"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Temporary Password</FormLabel>
                <Input
                  type="text"
                  value="Truda123"
                  isReadOnly
                  borderRadius="none"
                  bg="gray.100"
                  fontWeight="bold"
                  color="green.600"
                />
                <Text fontSize="xs" color="gray.600" mt={2}>
                  All new users login with username and password "Truda123". They will be prompted to create their own password on first login.
                </Text>
              </FormControl>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    borderRadius="none"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    borderRadius="none"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>User Type (Auto-fills Role, Branch, Groups, Cost Codes)</FormLabel>
                <Select
                  value={formData.userType || ''}
                  onChange={(e) => handleUserTypeChange(e.target.value)}
                  placeholder="Select user type..."
                  borderRadius="none"
                >
                  <option value="" disabled hidden>Select a user type...</option>
                  {userTypeCostCodesConfig.length > 0 ? (
                    userTypeCostCodesConfig.map(type => (
                      <option key={type.name} value={type.name}>
                        {type.name} ({type.role || 'User'} - {type.branch || 'PMB'})
                      </option>
                    ))
                  ) : (
                    <option disabled>No user types available</option>
                  )}
                </Select>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Selecting a user type will automatically set the role, branch, groups, and cost codes
                </Text>
              </FormControl>

              {formData.userType && (
                <>
                  <Box borderTop="1px" borderColor="gray.200" pt={4}>
                    <Text fontSize="sm" fontWeight="medium" mb={3}>Auto-filled from User Type</Text>

                    <FormControl mb={4}>
                      <FormLabel fontSize="sm">Assigned Groups</FormLabel>
                      <Box border="1px" borderColor="gray.200" p={2} borderRadius="md" bg="gray.50" minH="40px">
                        {formData.assignedGroups && formData.assignedGroups.length > 0 ? (
                          <Wrap spacing={2}>
                            {formData.assignedGroups.map(group => (
                              <Badge key={group} colorScheme="blue" borderRadius="full">
                                {group}
                              </Badge>
                            ))}
                          </Wrap>
                        ) : (
                          <Text fontSize="sm" color="gray.500">All groups</Text>
                        )}
                      </Box>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Assigned Cost Codes <Text as="span" fontSize="xs" color="gray.500">(Optional)</Text></FormLabel>
                      <Box
                        border="1px"
                        borderColor="gray.200"
                        p={2}
                        borderRadius="md"
                        bg="gray.50"
                        maxH="150px"
                        overflowY="auto"
                        minH="40px"
                      >
                        {formData.assignedCostCodes && formData.assignedCostCodes.length > 0 ? (
                          <Wrap spacing={2}>
                            {formData.assignedCostCodes.map(code => (
                              <Badge key={code} colorScheme="green" borderRadius="full" fontSize="xs">
                                {code}
                              </Badge>
                            ))}
                          </Wrap>
                        ) : (
                          <Text fontSize="sm" color="gray.500">Leave empty to give group-level access to all cost codes in assigned groups</Text>
                        )}
                      </Box>
                      <HStack fontSize="xs" color="gray.500" mt={2} spacing={1}>
                        <FiInfo />
                        <Text>
                          <strong>Security Tip:</strong> Select specific codes for strict control. Leave empty for group-level access.
                        </Text>
                      </HStack>
                    </FormControl>
                  </Box>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose} borderRadius="none">
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleAddUser}
              isLoading={saving}
              borderRadius="none"
            >
              Create User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="none">
          <ModalHeader>Delete User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete user "{userToDelete?.username}"?</Text>
            <Text color="red.500" fontSize="sm" mt={2}>This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose} borderRadius="none">
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeleteUser}
              isLoading={saving}
              borderRadius="none"
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Manage User Types Modal */}
      <Modal isOpen={isManageUserTypesOpen} onClose={onManageUserTypesClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="none">
          <ModalHeader>Manage User Types</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between" align="center">
                <Text fontSize="md" fontWeight="medium">User Type Cost Code Configurations</Text>
                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="brand"
                  onClick={onAddUserTypeOpen}
                  borderRadius="none"
                >
                  Add New User Type
                </Button>
              </HStack>

              <Input
                placeholder="Search user types by name..."
                value={userTypeSearchTerm}
                onChange={(e) => setUserTypeSearchTerm(e.target.value.toLowerCase())}
                borderRadius="none"
                size="sm"
              />

              <Box borderRadius="none" border="1px" borderColor="gray.200" maxH="400px" overflowY="auto">
                <Card borderRadius="none" border="none" shadow="none">
                  <TableContainer>
                    <Table size="sm">
                      <Thead position="sticky" top={0} bg="white" zIndex={1}>
                        <Tr>
                          <Th bg="gray.50">Type Name</Th>
                          <Th bg="gray.50">Role</Th>
                          <Th bg="gray.50">Branch</Th>
                          <Th bg="gray.50">Groups</Th>
                          <Th bg="gray.50">Cost Codes</Th>
                          <Th bg="gray.50">Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {userTypeCostCodesConfig.length > 0 ? (
                          userTypeCostCodesConfig
                            .filter(type => type.name.toLowerCase().includes(userTypeSearchTerm))
                            .map((type, index) => (
                              <Tr key={type.name} _hover={{ bg: 'gray.50' }}>
                                <Td fontWeight="medium">{type.name}</Td>
                                <Td fontSize="sm">{type.role || 'User'}</Td>
                                <Td fontSize="sm">{type.branch || 'PMB'}</Td>
                                <Td fontSize="sm">{(type.assignedGroups || []).join(', ') || '-'}</Td>
                                <Td fontSize="sm">{type.costCodes.map(code => formatCostCode(code)).join(', ')}</Td>
                                <Td>
                                  <IconButton
                                    size="sm"
                                    variant="ghost"
                                    icon={<FiEdit2 />}
                                    aria-label="Edit user type"
                                    onClick={() => {
                                      setEditingUserType(type);
                                      setUserTypeFormData({
                                        name: type.name,
                                        role: type.role || 'User',
                                        branch: type.branch || 'PMB',
                                        assignedGroups: type.assignedGroups || [],
                                        costCodes: type.costCodes
                                      });
                                      onEditUserTypeOpen();
                                    }}
                                  />
                                  <IconButton
                                    size="sm"
                                    variant="ghost"
                                    icon={<FiTrash />}
                                    aria-label="Delete user type"
                                    onClick={() => {
                                      setDeletingUserType(type);
                                      onDeleteUserTypeOpen();
                                    }}
                                    ml={2}
                                    color="red.500"
                                  />
                                </Td>
                              </Tr>
                            ))
                        ) : (
                          <Tr>
                            <Td colSpan={6} textAlign="center" py={8} color="gray.500">
                              No user types configured.
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>

              {userTypeCostCodesConfig.filter(type => type.name.toLowerCase().includes(userTypeSearchTerm)).length === 0 && userTypeSearchTerm && (
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  No user types match "{userTypeSearchTerm}"
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => {
              setUserTypeSearchTerm('');
              onManageUserTypesClose();
            }} borderRadius="none">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add/Edit User Type Modal (Nested) */}
      <Modal isOpen={isAddUserTypeOpen || isEditUserTypeOpen} onClose={isAddUserTypeOpen ? onAddUserTypeClose : onEditUserTypeClose} size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="none">
          <ModalHeader>{editingUserType ? 'Edit User Type' : 'Add New User Type'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>User Type Name</FormLabel>
                <Input
                  value={userTypeFormData.name}
                  onChange={(e) => setUserTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Maintenance Manager"
                  borderRadius="none"
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={userTypeFormData.role}
                    onChange={(e) => setUserTypeFormData(prev => ({ ...prev, role: e.target.value }))}
                    borderRadius="none"
                  >
                    {ROLES.map(role => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Branch</FormLabel>
                  <Select
                    value={userTypeFormData.branch}
                    onChange={(e) => setUserTypeFormData(prev => ({ ...prev, branch: e.target.value }))}
                    borderRadius="none"
                  >
                    {BRANCHES.map(branch => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Assigned Groups</FormLabel>
                {loadingGroups ? (
                  <Flex align="center" gap={2} p={2} borderWidth="1px" borderColor="gray.200" borderRadius="md">
                    <Spinner size="sm" color="brand.500" />
                    <Text fontSize="sm" color="gray.600">Loading groups...</Text>
                  </Flex>
                ) : (
                  <Box border="1px" borderColor="gray.200" p={3} maxH="150px" overflowY="auto">
                    <Wrap spacing={2}>
                      {groups.filter(group => group && group.trim()).map(group => (
                        <WrapItem key={group}>
                          <Checkbox
                            isChecked={userTypeFormData.assignedGroups?.includes(group)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserTypeFormData(prev => ({
                                  ...prev,
                                  assignedGroups: [...(prev.assignedGroups || []), group]
                                }));
                              } else {
                                setUserTypeFormData(prev => ({
                                  ...prev,
                                  assignedGroups: (prev.assignedGroups || []).filter(g => g !== group)
                                }));
                              }
                            }}
                            size="sm"
                            colorScheme="brand"
                          >
                            {group}
                          </Checkbox>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Select groups this user type can access
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Assigned Cost Codes</FormLabel>
                <Input
                  placeholder="Search cost codes..."
                  value={costCodeSearchTerm}
                  onChange={(e) => setCostCodeSearchTerm(e.target.value.toLowerCase())}
                  borderRadius="none"
                  size="sm"
                  mb={2}
                />
                <Box
                  border="1px"
                  borderColor="gray.200"
                  p={3}
                  maxH="200px"
                  overflowY="scroll"
                  overflowX="hidden"
                  onWheel={(e) => e.stopPropagation()}
                  css={{
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#cbd5e0',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#a0aec0',
                    },
                  }}
                >
                  <CheckboxGroup
                    value={userTypeFormData.costCodes}
                    onChange={(codes) => setUserTypeFormData(prev => ({ ...prev, costCodes: codes }))}
                  >
                    <VStack align="start" spacing={2}>
                      {costCodes
                        .filter(code => code.code.toLowerCase().includes(costCodeSearchTerm.toLowerCase()))
                        .map(code => (
                          <Checkbox key={code.id} value={code.code} size="sm" colorScheme="brand">
                            {formatCostCode(code.code)}
                          </Checkbox>
                        ))}
                    </VStack>
                  </CheckboxGroup>
                </Box>
                {costCodes.filter(code => code.code.toLowerCase().includes(costCodeSearchTerm.toLowerCase())).length === 0 && costCodeSearchTerm && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    No cost codes match "{costCodeSearchTerm}"
                  </Text>
                )}
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Search and select cost codes for this user type. Leave empty for access to all cost codes.
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setCostCodeSearchTerm('');
                isAddUserTypeOpen ? onAddUserTypeClose() : onEditUserTypeClose();
              }}
              borderRadius="none"
            >
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              onClick={editingUserType ? handleEditUserType : handleAddUserType}
              isLoading={savingUserTypes} // Using savingUserTypes state
              borderRadius="none"
            >
              {editingUserType ? 'Save Changes' : 'Add User Type'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User Type Confirmation Modal (Nested) */}
      <Modal isOpen={isDeleteUserTypeOpen} onClose={onDeleteUserTypeClose} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="none">
          <ModalHeader>Delete User Type</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete user type "{deletingUserType?.name}"?</Text>
            <Text color="red.500" fontSize="sm" mt={2}>This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteUserTypeClose} borderRadius="none">
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeleteUserType}
              isLoading={savingUserTypes} // Using savingUserTypes state
              borderRadius="none"
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserManagement;