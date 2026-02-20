const sql = require('mssql');
require('dotenv').config();
const { database } = require('./winstonLogger');

class DatabaseManager {
  constructor() {
    this.pools = new Map(); // Use Map instead of object to avoid key collision issues
    this.poolPromises = new Map(); // Promise-based pooling to prevent race conditions
    this.branchOrder = ['PMB', 'PTA', 'QTN', 'CPT'];
    this.initialized = false;
    this.branchConfigs = {
      PMB: {
        server: process.env.PMB_SERVER,
        name: 'Pietermaritzburg',
        database: process.env.PMB_DB
      },
      PTA: {
        server: process.env.PTA_SERVER,
        name: 'Pretoria',
        database: process.env.PTA_DB
      },
      QTN: {
        server: process.env.QTN_SERVER,
        name: 'Queenstown',
        database: process.env.QTN_DB
      },
      CPT: {
        server: process.env.CPT_SERVER,
        name: 'Cape Town',
        database: process.env.CPT_DB
      }
    };
  }

  async createPool(branch) {
    const config = this.branchConfigs[branch];
    if (!config) {
      throw new Error(`Unknown branch: ${branch}`);
    }

    if (!config.database) {
      throw new Error(`Database name not configured for branch: ${branch}`);
    }

    const poolConfig = {
      user: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASS,
      server: config.server,
      database: config.database,
      port: parseInt(process.env.MSSQL_PORT),
      options: {
        encrypt: true, // Enable encryption for credential protection (even on internal networks)
        trustServerCertificate: true, // Accept self-signed certificates (OK for internal network)
        enableArithAbort: true,
        integratedSecurity: false,
        connectTimeout: 15000
      },
      pool: {
        max: 20, // Increased from 10 to handle concurrent requests better
        min: 2,  // Keep 2 idle connections ready for new requests
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 10000 // Timeout if can't acquire connection after 10s
      }
    };

    try {
      database.info(`🔗 Connecting to ${branch} (${config.name}) at ${config.server}:${poolConfig.port}...`);
      const pool = await sql.connect(poolConfig);

      // Add error handler to cleanup on connection errors
      pool.on('error', (err) => {
        database.error(`🔴 Pool error for ${branch}: ${err.message}`);
        this.pools.delete(branch);
        this.poolPromises.delete(branch);
      });

      database.info(`✅ ${branch} (${config.name}) - Connection successful to database: ${poolConfig.database}`);
      return pool;
    } catch (error) {
      database.error(`❌ ${branch} (${config.name}) - Connection failed: ${error.message} (${error.code || 'N/A'})`);

      // Cleanup failed connection from cache
      delete this.pools[branch];
      delete this.poolPromises[branch];

      if (process.env.NODE_ENV !== 'production') {
        // Full error details only in non-production
      }
      throw error;
    }
  }

  async getPool(branch) {
    // Promise-based pooling prevents race conditions if multiple requests come in simultaneously
    if (!this.poolPromises.has(branch)) {
      this.poolPromises.set(branch, (async () => {
        if (!this.pools.has(branch)) {
          this.pools.set(branch, await this.createPool(branch));
        }
        return this.pools.get(branch);
      })());
    }
    return this.poolPromises.get(branch);
  }

  async executeBranchQuery(branch, query, params = []) {
    const config = this.branchConfigs[branch];
    const startTime = Date.now();

    try {
      // Create isolated connection for this query to ensure data isolation
      const connection = new sql.ConnectionPool({
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASS,
        server: config.server,
        database: config.database,
        port: parseInt(process.env.MSSQL_PORT),
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
          integratedSecurity: false,
          connectTimeout: 15000
        },
        pool: {
          max: 2,
          min: 0,
          idleTimeoutMillis: 10000
        }
      });

      await connection.connect();
      const request = connection.request();

      // Bind parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, sql.NVarChar, param);
      });

      const result = await request.query(query);
      const duration = Date.now() - startTime;

      await connection.close();

      return {
        branch,
        data: result.recordset,
        success: true,
        duration: `${duration}ms`,
        recordCount: result.recordset.length
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        branch,
        data: [],
        success: false,
        error: error.message,
        duration: `${duration}ms`
      };
    }
  }

  async queryAllBranches(query, params = []) {
    // First attempt: Query all branches in parallel
    const promises = this.branchOrder.map(branch =>
      this.executeBranchQuery(branch, query, params)
    );

    const results = await Promise.all(promises);

    // Identify failed branches
    const failedBranches = results.filter(r => !r.success).map(r => r.branch);

    if (failedBranches.length > 0) {
      database.info(`🔄 Retrying ${failedBranches.length} failed branch(es): ${failedBranches.join(', ')}`);

      // Retry failed branches individually (up to 2 more times with exponential backoff)
      for (let retryCount = 1; retryCount <= 2; retryCount++) {
        const delay = 500 * Math.pow(2, retryCount - 1); // 500ms, 1000ms

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry each failed branch
        for (const branch of failedBranches) {
          const retryResult = await this.executeBranchQuery(branch, query, params);

          if (retryResult.success) {
            database.info(`✅ ${branch} recovered on retry #${retryCount}`);
            // Replace the failed result with the successful one
            const failedIndex = results.findIndex(r => r.branch === branch);
            results[failedIndex] = retryResult;
            // Remove from failed list for next retry
            failedBranches.splice(failedBranches.indexOf(branch), 1);
          } else {
            database.warn(`❌ ${branch} still failing: ${retryResult.error}`);
          }
        }

        // If no more failures, break early
        if (failedBranches.length === 0) {
          database.info(`✅ All branches recovered after retry #${retryCount}`);
          break;
        }
      }

      // Log final status
      const successCount = results.filter(r => r.success).length;
      database.info(`📊 Final result: ${successCount}/${this.branchOrder.length} branches succeeded`);
    }

    return results;
  }

  async queryBranch(branch, query, params = []) {
    const config = this.branchConfigs[branch];
    if (!config) {
      throw new Error(`Unknown branch: ${branch}`);
    }

    try {
      const startTime = Date.now();

      // Create isolated connection for this query to ensure data isolation
      const connection = new sql.ConnectionPool({
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASS,
        server: config.server,
        database: config.database,
        port: parseInt(process.env.MSSQL_PORT),
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
          integratedSecurity: false,
          connectTimeout: 15000
        },
        pool: {
          max: 2,
          min: 0,
          idleTimeoutMillis: 10000
        }
      });

      await connection.connect();
      const request = connection.request();

      // Bind parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, sql.NVarChar, param);
      });

      const result = await request.query(query);
      const duration = Date.now() - startTime;

      await connection.close();

      return {
        branch,
        data: result.recordset,
        success: true,
        duration: `${duration}ms`,
        recordCount: result.recordset.length
      };
    } catch (error) {
      database.error(`❌ Query failed for ${branch}:`, error.message);
      return {
        branch,
        data: [],
        success: false,
        error: error.message
      };
    }
  }

  async closeAllPools() {
    for (const [branch, pool] of this.pools) {
      try {
        await pool.close();
        if (process.env.NODE_ENV !== 'production') database.info(`Closed connection to ${branch}`);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') database.error(`Error closing ${branch} connection:`, error);
      }
    }
    this.pools.clear();
  }

  getBranchInfo(branch) {
    return this.branchConfigs[branch] || null;
  }

  getAllBranches() {
    return this.branchOrder.map(branch => ({
      code: branch,
      name: this.branchConfigs[branch].name,
      server: this.branchConfigs[branch].server
    }));
  }

  /**
   * Get connection status for all branches
   */
  async getConnectionStatus() {
    const status = {};

    for (const branch of this.branchOrder) {
      try {
        const pool = await this.getPool(branch);
        const request = pool.request();
        await request.query('SELECT 1');
        status[branch] = {
          connected: true,
          name: this.branchConfigs[branch].name,
          ip: this.branchConfigs[branch].ip,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        status[branch] = {
          connected: false,
          name: this.branchConfigs[branch].name,
          ip: this.branchConfigs[branch].ip,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    return status;
  }

  /**
   * Query all branches in parallel, then retry only failed branches individually
   * This ensures successful branches return data quickly while failed ones get retries
   */
  async queryAllBranchesWithRetry(query, params = []) {
    // First pass: query all branches in parallel
    const results = await this.queryAllBranches(query, params);
    
    // Find which branches failed
    const failedBranches = results.filter(r => !r.success).map(r => r.branch);
    
    if (failedBranches.length === 0) {
      database.info(`✅ All branches loaded successfully on first attempt`);
      return results;
    }
    
    database.info(`🔄 Retrying failed branches: ${failedBranches.join(', ')}`);
    
    // Retry only the failed branches with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      const failedIndexes = results
        .map((r, idx) => r.success ? null : idx)
        .filter(idx => idx !== null);
      
      if (failedIndexes.length === 0) break;
      
      // Retry all currently failed branches in parallel
      const retryPromises = failedIndexes.map(async (idx) => {
        const branch = results[idx].branch;
        const delay = Math.pow(2, attempt - 1) * 1000;
        
        database.info(`⏳ ${branch} waiting ${delay}ms before retry attempt ${attempt}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          const result = await this.queryBranch(branch, query, params);
          return { idx, result };
        } catch (error) {
          return { idx, result: { branch, success: false, error: error.message, data: [] } };
        }
      });
      
      const retryResults = await Promise.all(retryPromises);
      retryResults.forEach(({ idx, result }) => {
        results[idx] = result;
        const icon = result.success ? '✅' : '❌';
        database.info(`${icon} ${result.branch} retry attempt ${attempt}`);
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    database.info(`📊 Final: ${successCount}/${results.length} branches successful`);
    return results;
  }
}

module.exports = new DatabaseManager();