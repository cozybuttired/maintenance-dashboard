import React, { useState, useEffect } from 'react';
import { Box, Text, Flex, Spinner, useToast } from '@chakra-ui/react';
import Layout from './components/Layout';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import LoginForm from './components/LoginForm';
import UserManagement from './components/UserManagement';
import PasswordChangeForm from './components/PasswordChangeForm';
import dataCache from './services/dataCache';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const APP_VERSION = '1.0.0';

function App() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwordMustChange, setPasswordMustChange] = useState(false);

  // Navigation state (lifted from Layout)
  const [activeItem, setActiveItem] = useState('dashboard');

  // Branch filtering
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const availableBranches = ['ALL', 'PMB', 'PTA', 'QTN', 'CPT'];

  // Cost code drill-down
  const [selectedCostCode, setSelectedCostCode] = useState(null);

  // Dynamically determine available branches based on user's role
  const processedAvailableBranches = React.useMemo(() => {
    if (user && user.role !== 'ADMIN' && user.branch && user.branch !== 'ALL') {
      return [user.branch];
    }
    return ['ALL', 'PMB', 'PTA', 'QTN', 'CPT'];
  }, [user]);

  // Date range filtering - default to Year to Date
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getYearStart = () => formatLocalDate(new Date(new Date().getFullYear(), 0, 1));
  const getToday = () => formatLocalDate(new Date());

  const [dateRange, setDateRange] = useState({
    startDate: getYearStart(),
    endDate: getToday()
  });

  const handleDateRangeChange = (start, end) => {
    // Reject backward dates
    if (start && end && start > end) {
      return;
    }
    setDateRange({ startDate: start, endDate: end });
  };

  const handleBranchChange = (branch) => {
    // Non-admin users with a specific branch cannot view 'ALL'
    if (user && user.role !== 'ADMIN' && user.branch && user.branch !== 'ALL' && branch === 'ALL') {
      return; // Silently prevent the change
    }
    setSelectedBranch(branch);
    setSelectedCostCode(null); // Clear cost code filter when branch changes
  };

  const handleCostCodeSelect = (costCode) => {
    setSelectedCostCode(costCode);
  };

  const handleNavigate = (item) => {
    setActiveItem(item);
  };

  // Helper function to extract branch prefix from cost code
  const extractBranchFromCode = (costCode) => {
    if (!costCode) return null;
    const branches = ['PMB', 'PTA', 'QTN', 'CPT', 'CT'];
    const normalized = costCode.trim().toUpperCase();
    for (const branch of branches) {
      if (normalized.startsWith(branch + '-') || normalized.startsWith(branch + ' ')) {
        return branch;
      }
    }
    return null;
  };

  // Filter maintenance data based on date range, branch, AND cost code
  const filteredMaintenanceData = React.useMemo(() => {
    let filtered = maintenanceData;

    // Date range filter
    if (dateRange.startDate && dateRange.endDate) {
      filtered = filtered.filter(item => {
        const itemDate = item.date;
        return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
      });
    }

    if (selectedBranch !== 'ALL') {
      filtered = filtered.filter(item => item.branch === selectedBranch);
    }

    // For non-admin users, filter by cost code branch prefix to prevent cross-branch visibility
    if (user && user.role !== 'ADMIN' && user.branch && user.branch !== 'ALL') {
      filtered = filtered.filter(item => {
        const costCodeBranch = extractBranchFromCode(item.costCode);
        // Only show items where cost code belongs to user's branch (or has no branch prefix)
        return costCodeBranch === user.branch || costCodeBranch === null;
      });
    }

    if (selectedCostCode) {
      filtered = filtered.filter(item => item.costCode === selectedCostCode);
    }

    return filtered;
  }, [maintenanceData, selectedBranch, selectedCostCode, dateRange, user]);

  // Check for existing authentication on mount
  useEffect(() => {
    validateToken();
  }, []);

  // Adjust selectedBranch based on user's role and branch
  // Non-admin users are always locked to their assigned branch
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.branch && user.branch !== 'ALL') {
      setSelectedBranch(user.branch);
    } else if (user && user.role === 'ADMIN' && !processedAvailableBranches.includes(selectedBranch)) {
      // If admin logs in and previous selectedBranch is no longer available (e.g., from a dept head session), reset to 'ALL'
      setSelectedBranch('ALL');
    }
  }, [user, processedAvailableBranches]);

  // Force-lock non-admin users to their branch if selectedBranch somehow gets set to 'ALL'
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.branch && user.branch !== 'ALL' && selectedBranch === 'ALL') {
      setSelectedBranch(user.branch);
    }
  }, [user, selectedBranch]);

  // Refetch data when date range changes (with 500ms debounce)
  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => {
      fetchMaintenanceData();
    }, 500);

    return () => clearTimeout(timer);
  }, [dateRange, user]);

  const validateToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        fetchMaintenanceData();
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUser(data.user);
      fetchMaintenanceData(); // Fetch maintenance data after user data is loaded
    } catch (error) {
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const fetchMaintenanceData = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY = 2000;

    const cacheKey = `maintenance_${dateRange.startDate}_${dateRange.endDate}`;

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await fetch(`${API_BASE_URL}/maintenance/records?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(30000) // 30s timeout to allow for database retries
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const records = data.records || [];

      setMaintenanceData(records);
      setError(null);
      setLoading(false);

      // Save successful fetch to localStorage
      dataCache.saveToDisk(cacheKey, records, {
        dateRange,
        selectedBranch,
        fetchedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error(`[App] Fetch error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);

      // Try cached data first
      const cachedData = dataCache.getFromDisk(cacheKey);

      if (cachedData && cachedData.length > 0) {
        setMaintenanceData(cachedData);
        setLoading(false);
        setError('⚠️ Showing cached data - connection issue detected. Retrying...');

        // Retry in background if not exhausted
        if (retryCount < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          setTimeout(() => {
            fetchMaintenanceData(retryCount + 1);
          }, delay);
        }
      } else {
        // No cache, retry or fail
        setLoading(false);

        if (retryCount < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          setError(`Loading data... (attempt ${retryCount + 2})`);

          setTimeout(() => {
            fetchMaintenanceData(retryCount + 1);
          }, delay);
        } else {
          setError('Failed to load data. No cached data available. Check your connection.');
        }
      }
    }
  };

  const handleLogin = async (username, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();

      // Wait for success animation to show before setting user
      await new Promise(resolve => setTimeout(resolve, 2500));

      setUser(data.user);

      // Check if user must change password on first login
      if (data.passwordMustChange) {
        setPasswordMustChange(true);
        return; // Don't load dashboard yet
      }

      if (data.user.role !== 'ADMIN' && data.user.branch && data.user.branch !== 'ALL') {
        setSelectedBranch(data.user.branch);
      }
      fetchMaintenanceData();
    } catch (error) {
      setError('Login failed. Please check your credentials.');
    }
  };

  // Handle password change completion
  const handlePasswordChanged = () => {
    setPasswordMustChange(false);
    // Reload user data to reflect passwordMustChange = false
    fetchMaintenanceData();
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear all cached data
      dataCache.clearAll();

      setUser(null);
      setMaintenanceData([]);
      setActiveItem('dashboard');
      setError(null);
    }
  };

  // Render active view content
  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return (
          <MaintenanceDashboard
            data={filteredMaintenanceData}
            user={user}
            selectedBranch={selectedBranch}
            selectedCostCode={selectedCostCode}
            onCostCodeSelect={handleCostCodeSelect}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        );
      case 'users':
        return (
          <UserManagement user={user} />
        );
      case 'analytics':
      case 'settings':
        return (
          <Flex justify="center" align="center" h="400px">
            <Box textAlign="center">
              <Text fontSize="xl" color="gray.500" fontWeight="medium">
                {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)}
              </Text>
              <Text fontSize="md" color="gray.400" mt={2}>
                Coming Soon
              </Text>
            </Box>
          </Flex>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Flex minH="100vh" bg="gray.50" align="center" justify="center">
        <Box textAlign="center">
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text mt={4} color="gray.600">Loading dashboard...</Text>
        </Box>
      </Flex>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} error={error} />;
  }

  // Show password change form if user must change password on first login
  if (passwordMustChange) {
    return (
      <PasswordChangeForm
        user={user}
        onPasswordChanged={handlePasswordChanged}
        API_BASE_URL={API_BASE_URL}
      />
    );
  }

  return (
    <Layout
      user={user}
      selectedBranch={selectedBranch}
      onBranchChange={handleBranchChange}
      availableBranches={processedAvailableBranches}
      activeItem={activeItem}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      appVersion={APP_VERSION}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
