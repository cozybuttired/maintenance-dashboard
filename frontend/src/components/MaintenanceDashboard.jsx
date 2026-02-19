import React, { useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  Flex,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  SimpleGrid,
  Input,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  VStack,
  Icon,
} from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { FiX, FiCalendar, FiChevronDown, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { MetricsGrid } from './MetricCard';
import CostCodeBreakdownTable from './CostCodeBreakdownTable';

const MaintenanceDashboard = ({ data, user, selectedBranch, selectedCostCode, onCostCodeSelect, dateRange, onDateRangeChange }) => {


  const recordCount = data.length;
  const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
  const averageCost = recordCount > 0 ? totalAmount / recordCount : 0;
  const highestCost = recordCount > 0 ? Math.max(...data.map(item => item.amount || 0)) : 0;

  const stats = {
    totalAmount,
    recordCount,
    averageCost,
    highestCost,
  };


  // Date range preset helpers
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getYearStart = () => formatLocalDate(new Date(new Date().getFullYear(), 0, 1));
  const getToday = () => formatLocalDate(new Date());
  const getMonthStart = () => {
    const now = new Date();
    return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };
  const getQuarterStart = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    return formatLocalDate(new Date(now.getFullYear(), quarter * 3, 1));
  };
  const getLast12Months = () => {
    const now = new Date();
    return formatLocalDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
  };

  const datePresets = [
    { label: 'Year to Date', getRange: () => ({ start: getYearStart(), end: getToday() }) },
    { label: 'This Month', getRange: () => ({ start: getMonthStart(), end: getToday() }) },
    { label: 'This Quarter', getRange: () => ({ start: getQuarterStart(), end: getToday() }) },
    { label: 'Last 12 Months', getRange: () => ({ start: getLast12Months(), end: getToday() }) },
  ];

  const handlePresetSelect = (preset) => {
    const range = preset.getRange();
    onDateRangeChange(range.start, range.end);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const dashboardTitle = selectedBranch === 'ALL'
    ? 'Monthly Maintenance Trends (All Branches)'
    : `Monthly Maintenance Trends for ${selectedBranch}`;

  // Monthly trends data
  const monthlyData = React.useMemo(() => {
    const monthlyMap = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = month.toISOString().slice(0, 7);
      monthlyMap[monthKey] = {
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        total: 0
      };
    }

    data.forEach(item => {
      const monthKey = item.date.slice(0, 7);
      if (monthlyMap[monthKey]) {
        monthlyMap[monthKey].total += item.amount || 0;
      }
    });

    return Object.values(monthlyMap);
  }, [data]);

  // Current vs Previous Month comparison
  const monthComparison = React.useMemo(() => {
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = prevMonth.toISOString().slice(0, 7);

    let currentMonthTotal = 0;
    let prevMonthTotal = 0;

    data.forEach(item => {
      const itemMonthKey = item.date.slice(0, 7);
      if (itemMonthKey === currentMonthKey) {
        currentMonthTotal += item.amount || 0;
      } else if (itemMonthKey === prevMonthKey) {
        prevMonthTotal += item.amount || 0;
      }
    });

    const difference = currentMonthTotal - prevMonthTotal;
    const percentageChange = prevMonthTotal > 0 ? ((difference / prevMonthTotal) * 100) : 0;

    return {
      currentMonthTotal,
      prevMonthTotal,
      difference,
      percentageChange,
      isIncrease: difference > 0,
      currentMonthName: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      prevMonthName: prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  }, [data]);

  // Branch distribution data
  const branchData = React.useMemo(() => {
    const branchMap = {};
    data.forEach(item => {
      if (!branchMap[item.branch]) {
        branchMap[item.branch] = { name: item.branch, value: 0 };
      }
      branchMap[item.branch].value += item.amount || 0;
    });
    return Object.values(branchMap);
  }, [data]);

  // Category distribution data
  const categoryData = React.useMemo(() => {
    const categoryMap = {};
    data.forEach(item => {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = { name: item.category, value: 0 };
      }
      categoryMap[item.category].value += item.amount || 0;
    });
    return Object.values(categoryMap);
  }, [data]);

  // Cost Code table data with record counts
  const costCodeTableData = React.useMemo(() => {
    const costCodeMap = {};
    data.forEach(item => {
      if (!costCodeMap[item.costCode]) {
        costCodeMap[item.costCode] = {
          costCode: item.costCode,
          category: item.category,
          recordCount: 0,
          totalAmount: 0
        };
      }
      costCodeMap[item.costCode].recordCount++;
      costCodeMap[item.costCode].totalAmount += item.amount || 0;
    });
    return Object.values(costCodeMap).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [data]);

  const COLORS = ['#e11d48', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatAxisNumber = (value) => {
    return 'R' + new Intl.NumberFormat('en-ZA').format(value);
  };

  return (
    <Box>
      {/* Date Range Selector */}
      <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none" mb={4} p={3}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
          <HStack spacing={4}>
            <HStack spacing={2}>
              <FiCalendar color="#6b7280" />
              <Text fontSize="sm" fontWeight="medium" color="gray.700">Date Range:</Text>
            </HStack>
            <HStack spacing={2}>
              <Input
                type="date"
                size="sm"
                value={dateRange.startDate}
                onChange={(e) => onDateRangeChange(e.target.value, dateRange.endDate)}
                borderRadius="none"
                w="140px"
              />
              <Text fontSize="sm" color="gray.500">to</Text>
              <Input
                type="date"
                size="sm"
                value={dateRange.endDate}
                onChange={(e) => onDateRangeChange(dateRange.startDate, e.target.value)}
                borderRadius="none"
                w="140px"
              />
            </HStack>
          </HStack>

          <HStack spacing={2}>
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                variant="outline"
                rightIcon={<FiChevronDown />}
                borderRadius="none"
              >
                Quick Select
              </MenuButton>
              <MenuList borderRadius="none">
                {datePresets.map((preset) => (
                  <MenuItem
                    key={preset.label}
                    onClick={() => handlePresetSelect(preset)}
                    fontSize="sm"
                  >
                    {preset.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
        <Text fontSize="xs" color="gray.500" mt={2}>
          Showing data from {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)}
        </Text>
      </Card>

      {/* Top Row: Conditional Layout - Fixed Height to prevent jumping */}
      <Box minH="730px" mb={4} display="flex" flexDirection="column">
        {selectedCostCode ? (
          <CostCodeBreakdownTable
            records={data}
            costCode={selectedCostCode}
            onClose={() => onCostCodeSelect(null)}
          />
        ) : (
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} h="100%">
          {/* Left Column: Metric Cards + Cost Code Breakdown */}
          <VStack spacing={4} align="stretch">
            <MetricsGrid stats={stats} />

            <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none" h="600px">
              <CardBody display="flex" flexDirection="column" h="100%" p={0}>
                <Flex align="center" justify="space-between" p={3} borderBottom="1px" borderColor="gray.200" flexShrink={0}>
                  <Text fontSize="lg" fontWeight="medium">
                    Cost Code Breakdown
                  </Text>
                </Flex>
                <TableContainer flex="1" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg="white" zIndex={1}>
                    <Tr>
                      <Th bg="gray.50">Cost Code</Th>
                      <Th bg="gray.50">Category</Th>
                      <Th bg="gray.50">Records</Th>
                      <Th bg="gray.50">Total Amount</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {costCodeTableData.map((row) => (
                      <Tr
                        key={row.costCode}
                        cursor="pointer"
                        _hover={{ bg: 'gray.50' }}
                        onClick={() => onCostCodeSelect(row.costCode)}
                      >
                        <Td fontWeight="medium" color="gray.900">
                          {row.costCode}
                        </Td>
                        <Td color="gray.600">{row.category}</Td>
                        <Td>{row.recordCount}</Td>
                        <Td fontWeight="medium">{formatCurrency(row.totalAmount)}</Td>
                      </Tr>
                    ))}
                    {costCodeTableData.length === 0 && (
                      <Tr>
                        <Td colSpan={4} textAlign="center" py={8} color="gray.500">
                          No data available
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
                </TableContainer>
                <Box p={3} borderTop="1px" borderColor="gray.200" bg="gray.50" flexShrink={0}>
                  <Text fontSize="xs" color="gray.500">
                    Click a row to view detailed transactions
                  </Text>
                </Box>
              </CardBody>
            </Card>
          </VStack>

          {/* Right Column: Month Comparison + Monthly Trends Chart */}
          <VStack spacing={4} align="stretch">
            {/* Month-over-Month Comparison */}
            <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none" h="120px">
              <CardBody p={3} display="flex" flexDirection="column" justifyContent="center" h="100%">
                <Flex align="center" justify="space-between" mb={2}>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.500" mb={1}>Current Month</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="gray.900" lineHeight="1.2">
                      {formatCurrency(monthComparison.currentMonthTotal)}
                    </Text>
                  </Box>
                  <Flex
                    align="center"
                    gap={2}
                    px={4}
                    py={2}
                    bg={monthComparison.isIncrease ? 'red.50' : 'green.50'}
                    borderRadius="md"
                  >
                    <Icon
                      as={monthComparison.isIncrease ? FiTrendingUp : FiTrendingDown}
                      boxSize={5}
                      color={monthComparison.isIncrease ? 'red.600' : 'green.600'}
                    />
                    <Text
                      fontSize="xl"
                      fontWeight="bold"
                      color={monthComparison.isIncrease ? 'red.600' : 'green.600'}
                    >
                      {monthComparison.isIncrease ? '+' : ''}{monthComparison.percentageChange.toFixed(1)}%
                    </Text>
                  </Flex>
                  <Box flex="1" textAlign="right">
                    <Text fontSize="xs" color="gray.500" mb={1}>Previous Month</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="gray.900" lineHeight="1.2">
                      {formatCurrency(monthComparison.prevMonthTotal)}
                    </Text>
                  </Box>
                </Flex>
                <Text fontSize="xs" color="gray.500" textAlign="center" mt={1}>
                  {monthComparison.currentMonthName} vs {monthComparison.prevMonthName}
                </Text>
              </CardBody>
            </Card>

            {/* Monthly Trends Chart */}
            <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none" h="600px">
              <CardBody display="flex" flexDirection="column" h="100%" p={3}>
                <Text fontSize="lg" fontWeight="medium" color="gray.900" mb={3}>{dashboardTitle}</Text>
                <Box flex="1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ left: 70, right: 20, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" tickFormatter={formatAxisNumber} />
                      <Tooltip formatter={(value) => [formatCurrency(value), 'Total Cost']} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#e11d48"
                        strokeWidth={2}
                        dot={{ fill: '#e11d48', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
          </VStack>
        </SimpleGrid>
        )}
      </Box>

      {/* Charts Section */}
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
        <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none" p={3}>
          <Text fontSize="lg" fontWeight="medium" color="gray.900" mb={3}>Cost by Branch</Text>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={branchData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {branchData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatCurrency(value), 'Total Cost']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none" p={3}>
          <Text fontSize="lg" fontWeight="medium" color="gray.900" mb={3}>Cost by Category</Text>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 100, right: 100, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" tickFormatter={formatAxisNumber} />
              <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Total Cost']} />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none" p={3}>
          <Text fontSize="lg" fontWeight="medium" color="gray.900" mb={3}>Records by Category</Text>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatCurrency(value), 'Total Cost']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </SimpleGrid>
    </Box>
  );
};

export default MaintenanceDashboard;
