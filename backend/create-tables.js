/**
 * Create Group and CostCode tables in MySQL
 */

const mysql = require('mysql2/promise');

async function createTables() {
  let connection;
  try {
    console.log('\n🔗 Connecting to MySQL...');
    connection = await mysql.createConnection({
      host: '10.0.60.57',
      user: 'chadupton',
      password: 'Letchadin24!',
      database: 'maintenance_db'
    });

    console.log('✅ Connected\n');

    // Create Group table
    console.log('📋 Creating Group table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`Group\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`isActive\` BOOLEAN NOT NULL DEFAULT true,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

        UNIQUE INDEX \`Group_name_key\`(\`name\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Group table created\n');

    // Create CostCode table
    console.log('📋 Creating CostCode table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`CostCode\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(191) NOT NULL,
        \`groupId\` VARCHAR(191) NOT NULL,
        \`branch\` VARCHAR(191),
        \`isActive\` BOOLEAN NOT NULL DEFAULT true,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

        UNIQUE INDEX \`CostCode_code_key\`(\`code\`),
        INDEX \`CostCode_groupId_idx\`(\`groupId\`),
        INDEX \`CostCode_branch_idx\`(\`branch\`),
        INDEX \`CostCode_code_idx\`(\`code\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`CostCode_groupId_fkey\` FOREIGN KEY (\`groupId\`) REFERENCES \`Group\` (\`id\`) ON DELETE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ CostCode table created\n');

    console.log('='.repeat(60));
    console.log('✅ TABLES CREATED SUCCESSFULLY');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createTables();
