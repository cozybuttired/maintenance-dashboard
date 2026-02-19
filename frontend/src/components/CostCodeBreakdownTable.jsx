import React, { useState, useMemo } from 'react';
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
  HStack,
  Select,
  Icon,
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiArrowLeft } from 'react-icons/fi';
import { formatCostCode } from '../utils/formatters';

const CostCodeBreakdownTable = ({ records, costCode, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Sort records
  const sortedRecords = useMemo(() => {
    const sorted = [...records];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric values
      if (typeof aValue === 'string' && !isNaN(parseFloat(aValue))) {
        aValue = parseFloat(aValue);
      }
      if (typeof bValue === 'string' && !isNaN(parseFloat(bValue))) {
        bValue = parseFloat(bValue);
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [records, sortConfig]);

  // Paginate records
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedRecords.slice(startIndex, endIndex);
  }, [sortedRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(records.length / pageSize);
  const startRecord = records.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, records.length);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePageSizeChange = (e) => {
    setPageSize(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const SortableHeader = ({ label, dataKey }) => (
    <Th
      bg="gray.50"
      cursor="pointer"
      _hover={{ bg: 'gray.100' }}
      onClick={() => handleSort(dataKey)}
      userSelect="none"
      py={2}
    >
      <Flex align="center" gap={1}>
        <Text fontSize="sm" fontWeight="medium">{label}</Text>
        {sortConfig.key === dataKey && (
          <Text fontSize="sm" color="brand.500">
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </Text>
        )}
      </Flex>
    </Th>
  );

  return (
    <Card borderRadius="none" border="1px" borderColor="gray.200" shadow="none" h="730px">
      <CardBody display="flex" flexDirection="column" h="100%" p={0}>
        {/* Header */}
        <Flex align="center" justify="space-between" p={3} borderBottom="1px" borderColor="gray.200" flexShrink={0}>
          <Box>
            <Text fontSize="lg" fontWeight="medium">
              Cost Code Details: {formatCostCode(costCode)}
            </Text>
            <Text fontSize="sm" color="gray.500" mt={1}>
              {records.length} transaction{records.length !== 1 ? 's' : ''} found
            </Text>
          </Box>
          <Button
            size="sm"
            bg="rgba(239, 68, 68, 0.2)"
            color="red.600"
            fontWeight="medium"
            border="1px solid"
            borderColor="rgba(239, 68, 68, 0.4)"
            _hover={{
              bg: "rgba(239, 68, 68, 0.3)",
              borderColor: "rgba(239, 68, 68, 0.6)"
            }}
            onClick={onClose}
            borderRadius="none"
            leftIcon={<Icon as={FiArrowLeft} />}
          >
            Back to Dashboard
          </Button>
        </Flex>

        {/* Table */}
        {records.length > 0 ? (
          <>
            <TableContainer flex="1" overflowY="auto" overflowX="hidden">
              <Table size="sm">
                <Thead position="sticky" top={0} bg="white" zIndex={1}>
                  <Tr>
                    <SortableHeader label="Date" dataKey="date" />
                    <SortableHeader label="Order #" dataKey="orderNumber" />
                    <SortableHeader label="Supplier" dataKey="supplier" />
                    <SortableHeader label="Description" dataKey="invDescription" />
                    <SortableHeader label="Line Total" dataKey="lineTotal" />
                    <SortableHeader label="Order Total" dataKey="orderTotal" />
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedRecords.map((record, index) => (
                    <Tr key={`${record.orderNumber}-${record.lineNo}-${index}`}>
                      <Td color="gray.700" fontSize="sm" py={2}>{formatDate(record.date)}</Td>
                      <Td color="gray.600" fontSize="sm" py={2}>{record.orderNumber || '-'}</Td>
                      <Td color="gray.700" fontSize="sm" py={2} maxW="280px" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" title={record.supplier}>{record.supplier || '-'}</Td>
                      <Td color="gray.700" fontSize="sm" py={2} maxW="300px" whiteSpace="normal" wordBreak="break-word">{record.invDescription || '-'}</Td>
                      <Td fontWeight="medium" color="gray.900" fontSize="sm" py={2}>
                        {formatCurrency(record.lineTotal || 0)}
                      </Td>
                      <Td fontWeight="medium" color="brand.600" fontSize="sm" py={2}>
                        {formatCurrency(record.orderTotal || 0)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>

            {/* Pagination Footer */}
            <Box p={3} borderTop="1px" borderColor="gray.200" bg="gray.50" flexShrink={0}>
              <Flex align="center" justify="space-between" gap={4} wrap="wrap" fontSize="sm">
                <Text color="gray.600">
                  Showing {startRecord}-{endRecord} of {records.length}
                </Text>

                <HStack spacing={2}>
                  <Select
                    size="sm"
                    w="140px"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    borderRadius="none"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </Select>

                  <HStack spacing={1}>
                    <Button
                      size="sm"
                      variant="outline"
                      isDisabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      leftIcon={<Icon as={FiChevronLeft} />}
                      borderRadius="none"
                    >
                      Previous
                    </Button>

                    <Text color="gray.600" px={2}>
                      Page {currentPage} of {totalPages}
                    </Text>

                    <Button
                      size="sm"
                      variant="outline"
                      isDisabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      rightIcon={<Icon as={FiChevronRight} />}
                      borderRadius="none"
                    >
                      Next
                    </Button>
                  </HStack>
                </HStack>
              </Flex>
            </Box>
          </>
        ) : (
          <Flex align="center" justify="center" p={8} flex="1">
            <Box textAlign="center">
              <Text fontSize="md" fontWeight="medium" color="gray.600" mb={2}>
                No records found
              </Text>
              <Text fontSize="sm" color="gray.500">
                No transactions for this cost code in the selected date range
              </Text>
            </Box>
          </Flex>
        )}
      </CardBody>
    </Card>
  );
};

export default CostCodeBreakdownTable;
