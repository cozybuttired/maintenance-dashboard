import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Card,
  CardBody,
  Button,
  Text,
  Flex,
  Select,
  Badge,
  Alert,
  AlertIcon,
  Collapse,
  SimpleGrid,
  FormControl,
  FormLabel,
  Icon,
} from '@chakra-ui/react';
import { FiFilter, FiDownload, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { formatCostCode } from '../utils/formatters';

const DataTable = ({ data, columns, onRowClick }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const filteredAndSortedData = useMemo(() => {
    let filteredData = [...data];

    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filteredData = filteredData.filter(item => {
          const itemValue = String(item[key]).toLowerCase();
          const filterValue = String(filters[key]).toLowerCase();
          return itemValue.includes(filterValue);
        });
      }
    });

    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredData;
  }, [data, filters, sortConfig]);

  const getStatusColor = (status) => {
    const colors = {
      'Completed': 'green',
      'In Progress': 'yellow',
      'Pending': 'blue',
      'Cancelled': 'red',
    };
    return colors[status] || 'gray';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'red',
      'High': 'orange',
      'Medium': 'blue',
      'Low': 'green',
    };
    return colors[priority] || 'gray';
  };

  const renderCell = (item, column) => {
    const value = item[column.key];

    switch (column.type) {
      case 'currency':
        return formatCurrency(value);
      case 'date':
        return formatDate(value);
      case 'costCode':
        return formatCostCode(value);
      case 'status':
        return (
          <Badge colorScheme={getStatusColor(value)} borderRadius="full" px={2}>
            {value}
          </Badge>
        );
      case 'priority':
        return (
          <Badge colorScheme={getPriorityColor(value)} borderRadius="full" px={2}>
            {value}
          </Badge>
        );
      default:
        return value;
    }
  };

  const uniqueValues = (key) => {
    return [...new Set(data.map(item => item[key]))].filter(Boolean);
  };

  return (
    <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none">
      {/* Header */}
      <Flex
        p={4}
        borderBottom="1px"
        borderColor="gray.200"
        align="center"
        justify="space-between"
      >
        <Text fontSize="lg" fontWeight="medium">
          Maintenance Records
        </Text>
        <Flex gap={2}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FiFilter />}
            onClick={() => setShowFilters(!showFilters)}
            borderRadius="none"
          >
            Filters
            {Object.keys(filters).length > 0 && (
              <Badge ml={2} colorScheme="brand" borderRadius="full">
                {Object.keys(filters).length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FiDownload />}
            borderRadius="none"
          >
            Export
          </Button>
        </Flex>
      </Flex>

      {/* Filters */}
      <Collapse in={showFilters}>
        <Box p={4} bg="gray.50" borderBottom="1px" borderColor="gray.200">
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
            {columns.map(column => (
              column.filterable && (
                <FormControl key={column.key} size="sm">
                  <FormLabel fontSize="sm">{column.label}</FormLabel>
                  <Select
                    size="sm"
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilter(column.key, e.target.value)}
                    borderRadius="none"
                  >
                    <option value="">All {column.label}</option>
                    {uniqueValues(column.key).map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </Select>
                </FormControl>
              )
            ))}
          </SimpleGrid>
          {Object.keys(filters).length > 0 && (
            <Flex mt={4} align="center" justify="space-between">
              <Text fontSize="sm" color="gray.500">
                {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''} applied
              </Text>
              <Button size="sm" variant="ghost" colorScheme="brand" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            </Flex>
          )}
        </Box>
      </Collapse>

      {/* Table */}
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              {columns.map(column => (
                <Th
                  key={column.key}
                  cursor={column.sortable ? 'pointer' : 'default'}
                  onClick={() => column.sortable && handleSort(column.key)}
                  bg="gray.50"
                  textTransform="uppercase"
                  fontSize="xs"
                  whiteSpace="nowrap"
                >
                  <Flex align="center" gap={1}>
                    {column.label}
                    {column.sortable && sortConfig.key === column.key && (
                      <Icon
                        as={sortConfig.direction === 'asc' ? FiChevronUp : FiChevronDown}
                        boxSize={4}
                      />
                    )}
                  </Flex>
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {filteredAndSortedData.map((item, index) => (
              <Tr
                key={item.id || index}
                _hover={onRowClick ? { bg: 'gray.50' } : undefined}
                cursor={onRowClick ? 'pointer' : 'default'}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map(column => (
                  <Td key={column.key} fontSize="sm">
                    {renderCell(item, column)}
                  </Td>
                ))}
              </Tr>
            ))}
            {filteredAndSortedData.length === 0 && (
              <Tr>
                <Td colSpan={columns.length} textAlign="center" py={8}>
                  <Alert status="info" justifyContent="center" borderRadius="none">
                    <AlertIcon />
                    No records found
                  </Alert>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Footer */}
      <Flex
        p={4}
        borderTop="1px"
        borderColor="gray.200"
        align="center"
        justify="space-between"
      >
        <Text fontSize="sm" color="gray.500">
          Showing {filteredAndSortedData.length} of {data.length} records
        </Text>
      </Flex>
    </Card>
  );
};

export default DataTable;
