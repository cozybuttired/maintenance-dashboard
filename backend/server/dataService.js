const dbManager = require('./dbManager');
const costCodeService = require('./costCodeService');
const cacheService = require('./cacheService');

class DataService {
  /**
   * Fetch maintenance purchase records from TNT_vw_MaintenancePurchases
   * Maps view fields to dashboard structure
   * Supports date range filtering
   * Caches results for 5 minutes to reduce database load
   */
  async getPurchaseRecords(branch = null, filters = {}) {
    try {
      // Generate cache key
      const cacheKey = cacheService.generateKey(`records:${branch || 'all'}`, filters);

      // Check cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        console.log(`[${new Date().toISOString()}] 💾 Cache HIT for ${branch || 'all branches'}`);
        return cachedData;
      }

      // Build WHERE clause with date range if provided
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.startDate) {
        whereClause += ` AND [DATE] >= @param${params.length}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClause += ` AND [DATE] <= @param${params.length}`;
        params.push(filters.endDate);
      }

      const query = `
        SELECT
          [DATE] as [date],
          [ORDER NUMBER] as [orderNumber],
          [SUPPLIER] as [supplier],
          [ORDER TOTAL] as [orderTotal],
          [ITEM CODE] as [itemCode],
          [INV DESCRIPTION] as [invDescription],
          [LINE TOTAL] as [lineTotal],
          [COST CODE] as [costCode],
          [GROUP] as [group],
          [LINE NO] as [lineNo],
          [QCODE] as [qCode],
          [GRV REFERENCE] as [grvReference],
          [ITEM DESCRIPTION] as [itemDescription],
          [PERIOD] as [period]
        FROM [dbo].[TNT_vw_MaintenancePurchases]
        ${whereClause}
      `;

      let result;

      if (branch) {
        console.log(`[${new Date().toISOString()}] 📥 Fetching purchase records from ${branch}...`);
        if (filters.startDate || filters.endDate) {
          console.log(`   Date range: ${filters.startDate} to ${filters.endDate}`);
        }
        result = await dbManager.queryBranch(branch, query, params);
        console.log(`[${new Date().toISOString()}] 📊 Raw result for ${branch}:`, { success: result.success, dataLength: result.data?.length, error: result.error });
        const records = this._processRecords([result]);
        console.log(`[${new Date().toISOString()}] ✅ Retrieved ${records.length} records from ${branch}`);

        // Cache for 5 minutes
        cacheService.set(cacheKey, records, 300);
        return records;
      } else {
        console.log(`[${new Date().toISOString()}] 📥 Fetching purchase records from all branches...`);
        if (filters.startDate || filters.endDate) {
          console.log(`   Date range: ${filters.startDate} to ${filters.endDate}`);
        }
        result = await dbManager.queryAllBranches(query, params);
        const records = this._processRecords(result);
        const successCount = result.filter(r => r.success).length;
        console.log(`[${new Date().toISOString()}] ✅ Retrieved ${records.length} total records from ${successCount} branches`);
        result.forEach(r => {
          const icon = r.success ? '✅' : '❌';
          const recordCount = r.success ? (r.data?.length || 0) : 'N/A';
          console.log(`   ${icon} ${r.branch}: ${r.success ? recordCount + ' records' : 'failed - ' + r.error}`);
        });

        // Cache for 5 minutes
        cacheService.set(cacheKey, records, 300);
        return records;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching purchase records:`, error.message);
      throw error;
    }
  }

  /**
   * Get aggregated statistics from purchase records
   */
  async getPurchaseStats(records) {
    const stats = {
      totalAmount: 0,
      recordCount: records.length,
      completedCount: records.length, // All MSSQL records are treated as completed
      branchStats: {},
      groupStats: {},
      costCodeStats: {}
    };

    records.forEach(record => {
      const branch = record.branch || 'Unknown';
      const group = record.group || 'Unknown';
      const costCode = record.costCode || 'Unclassified';
      const amount = parseFloat(record.orderTotal) || 0;

      // Totals
      stats.totalAmount += amount;

      // By branch
      if (!stats.branchStats[branch]) {
        stats.branchStats[branch] = { total: 0, count: 0 };
      }
      stats.branchStats[branch].total += amount;
      stats.branchStats[branch].count += 1;

      // By group
      if (!stats.groupStats[group]) {
        stats.groupStats[group] = { total: 0, count: 0 };
      }
      stats.groupStats[group].total += amount;
      stats.groupStats[group].count += 1;

      // By cost code
      if (!stats.costCodeStats[costCode]) {
        stats.costCodeStats[costCode] = {
          total: 0,
          count: 0,
          group: group
        };
      }
      stats.costCodeStats[costCode].total += amount;
      stats.costCodeStats[costCode].count += 1;
    });

    return stats;
  }

  /**
   * Paginate records (useful for large datasets)
   * Returns page with metadata about total count and pages available
   */
  paginateRecords(records, pageNumber = 1, pageSize = 50) {
    const totalRecords = records.length;
    const totalPages = Math.ceil(totalRecords / pageSize);

    // Validate page number
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages && totalPages > 0) pageNumber = totalPages;

    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageRecords = records.slice(startIndex, endIndex);

    return {
      data: pageRecords,
      pagination: {
        currentPage: pageNumber,
        pageSize: pageSize,
        totalRecords: totalRecords,
        totalPages: totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1
      }
    };
  }

  /**
   * Get monthly trends from purchase records
   */
  getMonthlyTrends(records, months = 12) {
    const trends = {};
    const now = new Date();

    // Initialize last 12 months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toISOString().slice(0, 7); // YYYY-MM format
      trends[key] = { total: 0, count: 0 };
    }

    // Aggregate by month
    records.forEach(record => {
      const recordDate = new Date(record.date);
      const key = recordDate.toISOString().slice(0, 7);

      if (trends[key]) {
        const amount = parseFloat(record.orderTotal) || 0;
        trends[key].total += amount;
        trends[key].count += 1;
      }
    });

    // Convert to array format
    return Object.entries(trends).map(([month, data]) => ({
      month,
      total: data.total,
      count: data.count
    }));
  }

  /**
   * Check if a group name looks malformed (like "QTN - Mechanical" instead of proper group)
   * Filters out values that appear to be cost codes with branch prefixes
   */
  _isMalformedGroupName(groupName) {
    if (!groupName) return true;
    const branches = ['PMB', 'PTA', 'QTN', 'CPT'];
    const normalized = groupName.trim().toUpperCase();
    // If it starts with a branch prefix and has a dash (with or without spaces), it's malformed
    for (const branch of branches) {
      if (normalized.startsWith(branch + '-') || normalized.startsWith(branch + ' -')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Process raw database results and add branch info
   * Maps live data fields to dashboard field names
   */
  _processRecords(results) {
    const processed = [];
    const branchMap = {
      'PMB': 'Pietermaritzburg',
      'PTA': 'Pretoria',
      'QTN': 'Queenstown',
      'CPT': 'Cape Town'
    };

    results.forEach(result => {
      if (result.success && result.data) {
        result.data.forEach(record => {
          // Map live data to dashboard format
          // Use lineTotal as the amount (individual line item cost)
          // Fall back to orderTotal if lineTotal is not available
          const amount = parseFloat(record.lineTotal) || parseFloat(record.orderTotal) || 0;

          // Determine which branch owns this cost code
          const ownedByBranch = costCodeService.extractBranchFromCode(record.costCode) || result.branch;

          processed.push({
            ...record,
            branch: ownedByBranch, // Use the owning branch, not the source branch
            branchName: branchMap[ownedByBranch] || ownedByBranch,
            sourceDatabase: result.branch, // Track where it came from
            amount: amount, // Add amount field for dashboard compatibility
            // Use GROUP field as category (from database)
            category: record.group || 'Uncategorized',
            // Add status as 'Completed' for all purchase records (they're posted in Sage)
            status: 'Completed'
          });
        });
      }
    });

    return processed;
  }

  /**
   * Get distinct groups available in the data
   * Caches for 30 minutes since groups change infrequently
   */
  async getAvailableGroups(branch = null) {
    try {
      // Check cache first
      const cacheKey = cacheService.generateKey(`groups:${branch || 'all'}`);
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const query = `
        SELECT DISTINCT [GROUP] as [group]
        FROM [dbo].[TNT_vw_MaintenancePurchases]
        WHERE [GROUP] IS NOT NULL AND [DATE] >= '2025-01-01'
        ORDER BY [GROUP]
      `;  // Note: Already properly escaped

      let result;
      let groups;

      if (branch) {
        result = await dbManager.queryBranch(branch, query);
        groups = (result.data?.map(r => r.group) || []).filter(g => !this._isMalformedGroupName(g));
      } else {
        result = await dbManager.queryAllBranches(query);
        const groupsSet = new Set();
        const allGroups = [];
        result.forEach(r => {
          if (r.success && r.data) {
            r.data.forEach(record => {
              if (record.group) {
                allGroups.push(record.group);
                if (!this._isMalformedGroupName(record.group)) {
                  groupsSet.add(record.group);
                } else {
                  console.log(`[${new Date().toISOString()}] 🚫 Filtered out malformed group: "${record.group}"`);
                }
              }
            });
          }
        });
        groups = Array.from(groupsSet).sort();
        console.log(`[${new Date().toISOString()}] 📋 Available groups: ${groups.join(', ')}`);
      }

      // Cache for 30 minutes (groups change less frequently)
      cacheService.set(cacheKey, groups, 1800);
      return groups;
    } catch (error) {
      console.error('Error fetching available groups:', error);
      return [];
    }
  }

  /**
   * Get distinct cost codes available in the data
   * Caches for 30 minutes since cost codes change infrequently
   */
  async getAvailableCostCodes(branch = null) {
    try {
      // Check cache first
      const cacheKey = cacheService.generateKey(`costCodes:${branch || 'all'}`);
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const query = `
        SELECT DISTINCT [COST CODE] as [costCode]
        FROM [dbo].[TNT_vw_MaintenancePurchases]
        WHERE [COST CODE] IS NOT NULL AND [DATE] >= '2025-01-01'
        ORDER BY [COST CODE]
      `;

      let result;
      let codes;

      if (branch) {
        result = await dbManager.queryBranch(branch, query);
        const rawCodes = result.data?.map(r => r.costCode) || [];
        // Deduplicate and normalize
        codes = costCodeService.deduplicateCodes(rawCodes);
      } else {
        result = await dbManager.queryAllBranches(query);
        const costCodes = [];
        result.forEach(r => {
          if (r.success && r.data) {
            r.data.forEach(record => {
              if (record.costCode) costCodes.push(record.costCode);
            });
          }
        });
        // Deduplicate across all branches and normalize
        codes = costCodeService.deduplicateCodes(costCodes);
      }

      // Cache for 30 minutes (cost codes change less frequently)
      cacheService.set(cacheKey, codes, 1800);
      return codes;
    } catch (error) {
      console.error('Error fetching available cost codes:', error);
      return [];
    }
  }
}

module.exports = new DataService();
