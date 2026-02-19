import React from 'react';
import { Box, Card, CardBody, Text, Flex, SimpleGrid, Icon } from '@chakra-ui/react';
import { FiTrendingUp, FiHash, FiDivideCircle, FiArrowUp } from 'react-icons/fi';

const MetricCard = ({ title, value, icon: IconComponent, trend, color = 'brand' }) => {
  return (
    <Card borderRadius="none" shadow="none" border="1px" borderColor="gray.200" h="120px">
      <CardBody p={3} display="flex" alignItems="center" h="100%">
        <Flex align="center" justify="space-between" w="100%">
          <Box flex="1">
            <Text fontSize="xs" color="gray.500" mb={1}>
              {title}
            </Text>
            <Text fontSize="2xl" fontWeight="bold" lineHeight="1.2">
              {value}
            </Text>
            {trend && (
              <Flex align="center" mt={1}>
                <Icon as={FiTrendingUp} boxSize={4} color="green.500" mr={1} />
                <Text fontSize="sm" color="green.500">
                  {trend}
                </Text>
              </Flex>
            )}
          </Box>
          <Flex
            p={3}
            borderRadius="md"
            bg={`${color}.50`}
            color={`${color}.500`}
          >
            <Icon as={IconComponent} boxSize={6} />
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
};

const MetricsGrid = ({ stats }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
      <MetricCard
        title="Total Maintenance Cost"
        value={formatCurrency(stats.totalAmount || 0)}
        icon={FiTrendingUp}
        color="brand"
      />
      <MetricCard
        title="Number of Records"
        value={stats.recordCount}
        icon={FiHash}
        color="blue"
      />
    </SimpleGrid>
  );
};

export { MetricCard, MetricsGrid };
