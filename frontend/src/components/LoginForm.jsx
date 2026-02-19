import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Flex,
  Link,
} from '@chakra-ui/react';
import { MdCheckCircle } from 'react-icons/md';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineUser, AiOutlineLock } from 'react-icons/ai';

const LoginForm = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);


  // Success message removed - password change modal will appear immediately if needed
  // No need to show success message since user is redirected to password change or dashboard

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setHasAttemptedLogin(true);
    await onLogin(username, password);
    setIsLoading(false);
  };

  const MotionBox = motion(Box);

  return (
    <Flex minH="100vh" bg="white" position="relative" overflow="hidden">
      {/* LEFT SECTION - Visual/Branding (Full Height) */}
      <Flex
        w="40%"
        direction="column"
        align="center"
        justify="center"
        bg="#e11d48"
        p={16}
        position="relative"
        overflow="hidden"
      >
          {/* Animated Gradient Blobs */}
          <MotionBox
            position="absolute"
            top="-100px"
            left="-50px"
            w="400px"
            h="400px"
            borderRadius="45% 55% 65% 35%"
            filter="blur(80px)"
            animate={{
              borderRadius: ['45% 55% 65% 35%', '55% 45% 35% 65%', '65% 35% 45% 55%', '45% 55% 65% 35%'],
              x: [0, 30, 15, 0],
              y: [0, 40, 20, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            background="linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)"
            opacity={0.6}
            zIndex={1}
          />

          <MotionBox
            position="absolute"
            bottom="-80px"
            right="-50px"
            w="350px"
            h="350px"
            borderRadius="60% 40% 45% 55%"
            filter="blur(85px)"
            animate={{
              borderRadius: ['60% 40% 45% 55%', '40% 60% 55% 45%', '50% 50% 40% 60%', '60% 40% 45% 55%'],
              x: [0, -35, -18, 0],
              y: [0, -30, -15, 0],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            background="linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)"
            opacity={0.5}
            zIndex={1}
          />

          {/* Geometric Accent Lines */}
          <Box
            position="absolute"
            top="20%"
            right="10%"
            w="300px"
            h="2px"
            bg="rgba(255, 255, 255, 0.15)"
            transform="rotate(-15deg)"
            zIndex={1}
          />

          <Box
            position="absolute"
            bottom="25%"
            left="5%"
            w="250px"
            h="2px"
            bg="rgba(255, 255, 255, 0.1)"
            transform="rotate(25deg)"
            zIndex={1}
          />

          {/* Content */}
          <VStack spacing={8} position="relative" zIndex={2} textAlign="center">
            {/* Logo */}
            <Box>
              <img
                src="/Truda Foods.svg"
                alt="Truda Foods Logo"
                style={{
                  maxWidth: '260px',
                  height: 'auto',
                }}
              />
            </Box>

            {/* Welcome Message */}
            <VStack spacing={4}>
              <Text fontSize="3xl" fontWeight="bold" color="white">
                Welcome Back
              </Text>
              <Text fontSize="lg" color="rgba(255, 255, 255, 0.9)" maxW="300px" lineHeight="1.8" fontWeight="500">
                Track & Optimize Maintenance
              </Text>
            </VStack>
          </VStack>
        </Flex>

      {/* RIGHT SECTION - Login Form (Full Height) */}
      <Flex
        w="60%"
        direction="column"
        align="center"
        justify="space-between"
        bg="white"
        p={16}
        position="relative"
        minH="100vh"
      >
          {/* Animated Shape - Top Left */}
          <MotionBox
            position="absolute"
            top="10%"
            left="5%"
            w="100px"
            h="100px"
            borderRadius="30% 70% 70% 30%"
            bg="rgba(225, 29, 72, 0.05)"
            animate={{
              rotate: [0, 45, 90, 180, 270, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            zIndex={1}
          />

          {/* Animated Shape - Bottom Right */}
          <MotionBox
            position="absolute"
            bottom="5%"
            right="8%"
            w="80px"
            h="80px"
            borderRadius="70% 30% 30% 70%"
            bg="rgba(225, 29, 72, 0.04)"
            animate={{
              rotate: [360, 180, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            zIndex={1}
          />

          {/* Geometric Accent Lines - Form Side */}
          <Box
            position="absolute"
            top="15%"
            left="10%"
            w="200px"
            h="1px"
            bg="rgba(225, 29, 72, 0.1)"
            transform="rotate(-20deg)"
            zIndex={1}
          />

          <Box
            position="absolute"
            bottom="20%"
            right="12%"
            w="180px"
            h="1px"
            bg="rgba(225, 29, 72, 0.08)"
            transform="rotate(25deg)"
            zIndex={1}
          />

          {/* Abstract Circle - Top Right (Bigger) */}
          <MotionBox
            position="absolute"
            top="5%"
            right="2%"
            w="180px"
            h="180px"
            borderRadius="50%"
            bg="rgba(225, 29, 72, 0.05)"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            zIndex={1}
          />


          {/* Abstract Circle - Bottom Left (Large, 1/4 visible) */}
          <MotionBox
            position="absolute"
            bottom="-200px"
            left="-200px"
            w="450px"
            h="450px"
            borderRadius="50%"
            bg="rgba(225, 29, 72, 0.05)"
            animate={{
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            zIndex={1}
          />

          {/* Login Form Container - Center Section */}
          <Flex flex={1} align="center" justify="center" w="full">
            <VStack spacing={8} w="full" maxW="320px">
            {/* Header */}
            <VStack spacing={3} w="full">
              <Text fontSize="3xl" fontWeight="700" color="gray.900">
                Sign In
              </Text>
              <Box w="12" h="1" bg="#e11d48" borderRadius="full" />
              <Text fontSize="sm" color="gray.600">
                Access your maintenance dashboard
              </Text>
            </VStack>

            {/* Error Alert */}
            {error && (
              <Alert
                status="error"
                borderRadius="lg"
                w="full"
                bg="red.50"
                borderLeft="4px solid"
                borderColor="red.500"
                fontSize="sm"
              >
                <AlertIcon />
                <Text fontSize="xs">{error}</Text>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={6} w="full">
                {/* Username Field */}
                <Box w="full">
                  <HStack
                    spacing={3}
                    borderBottom="2px solid"
                    borderColor="gray.200"
                    pb={3}
                    position="relative"
                    _focusWithin={{ borderColor: '#e11d48' }}
                    transition="border-color 0.2s"
                  >
                    <AiOutlineUser size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username or email"
                      border="none"
                      fontSize="sm"
                      fontWeight="500"
                      _focus={{ outline: 'none' }}
                      _placeholder={{ color: 'gray.400', fontWeight: '400' }}
                      disabled={isLoading}
                    />
                  </HStack>
                </Box>

                {/* Password Field */}
                <Box w="full">
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
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      border="none"
                      fontSize="sm"
                      fontWeight="500"
                      _focus={{ outline: 'none' }}
                      _placeholder={{ color: 'gray.400', fontWeight: '400' }}
                      disabled={isLoading}
                    />
                    <Box
                      cursor="pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      display="flex"
                      alignItems="center"
                      color="gray.400"
                      _hover={{ color: '#e11d48' }}
                      transition="color 0.2s"
                    >
                      {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                    </Box>
                  </HStack>
                </Box>

                {/* Sign In Button - Premium Style */}
                <Button
                  type="submit"
                  w="full"
                  isLoading={isLoading}
                  loadingText="Signing in..."
                  bg="#e11d48"
                  color="white"
                  borderRadius="12px"
                  fontWeight="700"
                  py={6}
                  mt={4}
                  fontSize="md"
                  letterSpacing="0.5px"
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
                  Sign In
                </Button>
              </VStack>
            </form>
            </VStack>
          </Flex>

          {/* Footer Section - Version & Branding */}
          <VStack spacing={2} w="full" align="flex-end" justify="flex-end" position="absolute" bottom="24px" right="16px" pr={4}>
            <HStack spacing={1} opacity={0.7} mt={4}>
              <img
                src="/BO icon.svg"
                alt="Brite Orbit Logo"
                style={{
                  height: '14px',
                  width: 'auto',
                  opacity: 0.8,
                }}
              />
              <Text fontSize="9px" color="gray.600" fontWeight="400">
                Developed by Brite Orbit
              </Text>
            </HStack>
            <Text fontSize="9px" color="gray.500" fontWeight="700" pr={1}>
              v1.0.0
            </Text>
          </VStack>
        </Flex>

      {/* Combined Auth/Success Overlay */}
      {(isLoading || isSuccess) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: isSuccess ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: isSuccess ? 'blur(8px)' : undefined,
          }}
        >
          <MotionBox
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, type: 'spring', stiffness: 120 }}
          >
            <Flex
              direction="column"
              align="center"
              justify="center"
              gap={6}
              bg="white"
              p={16}
              borderRadius={isSuccess ? '20px' : '16px'}
              boxShadow={isSuccess ? '0 20px 60px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.1)'}
              minW={isSuccess ? '380px' : undefined}
              position="relative"
              overflow="hidden"
            >
              {isSuccess && (
                <Box
                  position="absolute"
                  top={0}
                  right={0}
                  w="200px"
                  h="200px"
                  bg="linear-gradient(135deg, rgba(225, 29, 72, 0.1), transparent)"
                  borderRadius="50%"
                  zIndex={0}
                />
              )}

              {/* Authenticating State */}
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: isSuccess ? 0 : 1 }}
                transition={{ duration: 0.5 }}
                style={{ display: isSuccess ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}
              >
                {/* Circular Progress Loader */}
                <motion.svg
                  width="80"
                  height="80"
                  viewBox="0 0 80 80"
                  fill="none"
                  style={{ position: 'relative' }}
                >
                  {/* Background circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="2"
                    opacity="0.1"
                  />
                  {/* Animated progress circle */}
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="2"
                    strokeDasharray="220"
                    initial={{ strokeDashoffset: 220 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 3.5, ease: 'easeInOut' }}
                    strokeLinecap="round"
                    style={{ transformOrigin: '40px 40px', transform: 'rotate(-90deg)' }}
                  />
                </motion.svg>

                <VStack spacing={1} textAlign="center" position="relative" zIndex={1}>
                  <Text fontSize="lg" fontWeight="600" color="gray.900">
                    Authenticating
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Securing your session...
                  </Text>
                </VStack>

                <Flex gap={1.5} position="relative" zIndex={1}>
                  <MotionBox
                    w={2}
                    h={2}
                    bg="#e11d48"
                    borderRadius="full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                  />
                  <MotionBox
                    w={2}
                    h={2}
                    bg="#e11d48"
                    borderRadius="full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                  />
                  <MotionBox
                    w={2}
                    h={2}
                    bg="#e11d48"
                    borderRadius="full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                  />
                </Flex>
              </motion.div>

              {/* Success State */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isSuccess ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                style={{ display: isSuccess ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%' }}
              >
                {/* Large animated checkmark */}
                <MotionBox
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  position="relative"
                  zIndex={1}
                >
                  <MdCheckCircle size={120} color="#e11d48" />
                </MotionBox>

                {/* Success Message */}
                <VStack spacing={3} position="relative" zIndex={1} textAlign="center">
                  <Text fontSize="3xl" fontWeight="900" color="gray.900">
                    Success!
                  </Text>
                  <Text fontSize="md" color="gray.600" fontWeight="500">
                    You're logged in and ready to go
                  </Text>
                </VStack>

                {/* Progress Loader */}
                <Box w="full" position="relative" zIndex={1}>
                  <Box
                    w="full"
                    h="2px"
                    bg="rgba(225, 29, 72, 0.1)"
                    borderRadius="full"
                    overflow="hidden"
                  >
                    <MotionBox
                      h="full"
                      bg="#e11d48"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.5, ease: 'easeInOut' }}
                      borderRadius="full"
                    />
                  </Box>
                </Box>
              </motion.div>
            </Flex>
          </MotionBox>
        </motion.div>
      )}

    </Flex>
  );
};

export default LoginForm;
