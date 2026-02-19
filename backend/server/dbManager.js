const sql = require('mssql');
require('dotenv').config();

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
      console.log(`[${new Date().toISOString()}] 🔗 Connecting to ${branch} (${config.name}) at ${config.server}:${poolConfig.port}...`);
      console.log(`   Database: ${config.database}`);
      console.log(`   Pool Config: server=${poolConfig.server}, database=${poolConfig.database}`);
      const pool = await sql.connect(poolConfig);

      // Add error handler to cleanup on connection errors
      pool.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] 🔴 Pool error for ${branch}:`, err.message);
        this.pools.delete(branch);
        this.poolPromises.delete(branch);
      });

      console.log(`[${new Date().toISOString()}] ✅ ${branch} (${config.name}) - Connection successful to database: ${poolConfig.database}`);
      return pool;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ ${branch} (${config.name}) - Connection failed:`);
      console.error(`   Server: ${config.server}:${poolConfig.port}`);
      console.error(`   Database: ${config.database}`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);

      // Cleanup failed connection from cache
      delete this.pools[branch];
      delete this.poolPromises[branch];

      if (process.env.NODE_ENV !== 'production') {
        console.error(`   Full Error:`, error);
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

  async queryAllBranches(query, params = []) {
    // Use Promise.all to query all branches in parallel instead of sequentially
    const promises = this.branchOrder.map(async (branch) => {
      const config = this.branchConfigs[branch];
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
        console.error(`[${new Date().toISOString()}] ❌ Query failed for ${branch}:`, error.message);
        return {
          branch,
          data: [],
          success: false,
          error: error.message
        };
      }
    });

    // Execute all queries in parallel and wait for all to complete
    const results = await Promise.all(promises);
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
      console.error(`[${new Date().toISOString()}] ❌ Query failed for ${branch}:`, error.message);
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
        if (process.env.NODE_ENV !== 'production') console.log(`Closed connection to ${branch}`);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error(`Error closing ${branch} connection:`, error);
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
}

module.exports = new DatabaseManager();