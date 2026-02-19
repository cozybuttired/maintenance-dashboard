import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Text,
  Progress,
  List,
  ListItem,
} from '@chakra-ui/react';
import { AiOutlineLock, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

const PasswordChangeForm = ({ user, onPasswordChanged, API_BASE_URL }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);

  // Check password strength
  const checkPasswordStrength = (password) => {
    const errors = [];
    if (!password || password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('At least one number');
    }
    return errors;
  };

  const handleNewPasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    setPasswordErrors(checkPasswordStrength(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordErrors.length > 0) {
      setError('Password does not meet requirements');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess(true);
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Call callback after success
      setTimeout(() => {
        onPasswordChanged();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      position="fixed"
      inset={0}
      bg="rgba(0, 0, 0, 0.5)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
    >
      <Box
        bg="white"
        borderRadius="lg"
        p={8}
        maxW="500px"
        w="90%"
        boxShadow="0 10px 40px rgba(0, 0, 0, 0.2)"
      >
        {/* Header */}
        <VStack spacing={4} w="full">
          <VStack spacing={2} w="full" textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="gray.900">
              Set Your Password
            </Text>
            <Text fontSize="sm" color="gray.600">
              This is your first login. Please create a secure password.
            </Text>
          </VStack>

          {error && (
            <Alert status="error" borderRadius="lg" w="full" bg="red.50">
              <AlertIcon />
              <Text fontSize="sm">{error}</Text>
            </Alert>
          )}

          {success && (
            <Alert status="success" borderRadius="lg" w="full" bg="green.50">
              <AlertIcon />
              <Text fontSize="sm">Password changed successfully! Redirecting...</Text>
            </Alert>
          )}

          {/* Current Password Field */}
          <Box w="full">
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
              Current Password (temporary)
            </Text>
            <HStack
              spacing={3}
              borderBottom="2px solid"
              borderColor="gray.200"
              pb={3}
              _focusWithin={{ borderColor: '#e11d48' }}
              transition="border-color 0.2s"
            >
              <AiOutlineLock size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter temporary password"
                border="none"
                fontSize="sm"
                fontWeight="500"
                _focus={{ outline: 'none' }}
                _placeholder={{ color: 'gray.400', fontWeight: '400' }}
                disabled={isLoading}
              />
              <Box
                cursor="pointer"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                display="flex"
                alignItems="center"
                color="gray.400"
                _hover={{ color: '#e11d48' }}
                transition="color 0.2s"
              >
                {showCurrentPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
              </Box>
            </HStack>
          </Box>

          {/* New Password Field */}
          <Box w="full">
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
              New Password
            </Text>
            <HStack
              spacing={3}
              borderBottom="2px solid"
              borderColor="gray.200"
              pb={3}
              _focusWithin={{ borderColor: '#e11d48' }}
              transition="border-color 0.2s"
            >
              <AiOutlineLock size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={handleNewPasswordChange}
                placeholder="Create new password"
                border="none"
                fontSize="sm"
                fontWeight="500"
                _focus={{ outline: 'none' }}
                _placeholder={{ color: 'gray.400', fontWeight: '400' }}
                disabled={isLoading}
              />
              <Box
                cursor="pointer"
                onClick={() => setShowNewPassword(!showNewPassword)}
                display="flex"
                alignItems="center"
                color="gray.400"
                _hover={{ color: '#e11d48' }}
                transition="color 0.2s"
              >
                {showNewPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
              </Box>
            </HStack>

            {/* Password Requirements */}
            {newPassword && (
              <Box mt={3} p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="xs" fontWeight="600" color="gray.700" mb={2}>
                  Password Requirements:
                </Text>
                <List spacing={1} fontSize="xs" color="gray.600">
                  <ListItem color={!passwordErrors.includes('At least 8 characters') ? 'green.600' : 'gray.600'}>
                    ✓ At least 8 characters
                  </ListItem>
                  <ListItem color={!passwordErrors.includes('At least one uppercase letter') ? 'green.600' : 'gray.600'}>
                    ✓ At least one uppercase letter (A-Z)
                  </ListItem>
                  <ListItem color={!passwordErrors.includes('At least one lowercase letter') ? 'green.600' : 'gray.600'}>
                    ✓ At least one lowercase letter (a-z)
                  </ListItem>
                  <ListItem color={!passwordErrors.includes('At least one number') ? 'green.600' : 'gray.600'}>
                    ✓ At least one number (0-9)
                  </ListItem>
                </List>
                <Progress
                  value={(5 - passwordErrors.length) * 25}
                  size="sm"
                  colorScheme={passwordErrors.length === 0 ? 'green' : 'orange'}
                  mt={2}
                  borderRadius="md"
                />
              </Box>
            )}
          </Box>

          {/* Confirm Password Field */}
          <Box w="full">
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
              Confirm Password
            </Text>
            <HStack
              spacing={3}
              borderBottom="2px solid"
              borderColor="gray.200"
              pb={3}
              _focusWithin={{ borderColor: '#e11d48' }}
              transition="border-color 0.2s"
            >
              <AiOutlineLock size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                border="none"
                fontSize="sm"
                fontWeight="500"
                _focus={{ outline: 'none' }}
                _placeholder={{ color: 'gray.400', fontWeight: '400' }}
                disabled={isLoading}
              />
              <Box
                cursor="pointer"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                display="flex"
                alignItems="center"
                color="gray.400"
                _hover={{ color: '#e11d48' }}
                transition="color 0.2s"
              >
                {showConfirmPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
              </Box>
            </HStack>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <Text fontSize="xs" color="red.600" mt={2}>
                Passwords do not match
              </Text>
            )}
          </Box>

          {/* Submit Button */}
          <Button
            w="full"
            bg="#e11d48"
            color="white"
            fontWeight="700"
            py={6}
            mt={4}
            fontSize="md"
            isLoading={isLoading}
            loadingText="Setting Password..."
            onClick={handleSubmit}
            disabled={
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              passwordErrors.length > 0 ||
              newPassword !== confirmPassword ||
              isLoading
            }
            _hover={{
              bg: '#dc1c42',
              boxShadow: '0 8px 24px rgba(225, 29, 72, 0.3)',
              transform: 'translateY(-2px)',
            }}
            _active={{
              bg: '#c91838',
              transform: 'translateY(0px)',
            }}
            transition="all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
          >
            Set Password & Continue
          </Button>

          <Text fontSize="xs" color="gray.500" textAlign="center">
            Your password must be secure and unique. Never share it with anyone.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
};

export default PasswordChangeForm;
