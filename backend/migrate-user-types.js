/**
 * Migration script: Migrate user types from Setting table to UserType table
 * Run this ONCE after the database schema changes are applied
 *
 * Usage: node migrate-user-types.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUserTypes() {
  try {
    console.log('🔄 Starting user type migration...\n');

    // Step 1: Get the user_type_cost_codes setting
    console.log('📖 Reading user type configurations from settings...');
    const setting = await prisma.setting.findUnique({
      where: { key: 'user_type_cost_codes' }
    });

    if (!setting || !setting.value) {
      console.log('⚠️  No user type configurations found in settings.');
      console.log('✅ Migration complete (nothing to migrate).\n');
      await prisma.$disconnect();
      return;
    }

    let userTypesData = [];
    try {
      userTypesData = JSON.parse(setting.value);
    } catch (err) {
      console.error('❌ Failed to parse user_type_cost_codes JSON:', err.message);
      await prisma.$disconnect();
      throw err;
    }

    if (!Array.isArray(userTypesData)) {
      console.error('❌ user_type_cost_codes is not an array');
      await prisma.$disconnect();
      throw new Error('Invalid data format');
    }

    console.log(`✅ Found ${userTypesData.length} user type configurations\n`);

    // Step 2: Create UserType records
    console.log('📝 Creating UserType records...');
    const createdUserTypes = [];

    for (const userTypeData of userTypesData) {
      try {
        const userType = await prisma.userType.create({
          data: {
            name: userTypeData.name,
            role: userTypeData.role || 'User',
            branch: userTypeData.branch || 'ALL',
            assignedGroups: userTypeData.assignedGroups
              ? JSON.stringify(userTypeData.assignedGroups)
              : null,
            costCodes: userTypeData.costCodes
              ? JSON.stringify(userTypeData.costCodes)
              : null
          }
        });

        createdUserTypes.push(userType);
        console.log(`  ✅ Created UserType: ${userType.name} (${userType.id})`);
      } catch (err) {
        if (err.code === 'P2002') {
          console.log(`  ⚠️  UserType "${userTypeData.name}" already exists, skipping...`);
        } else {
          console.error(`  ❌ Failed to create UserType "${userTypeData.name}":`, err.message);
          throw err;
        }
      }
    }

    console.log(`\n✅ Created ${createdUserTypes.length} UserType records\n`);

    // Step 3: Update User records to link to UserType using raw SQL
    console.log('🔗 Linking users to UserType records...');
    let updatedCount = 0;

    for (const userType of createdUserTypes) {
      try {
        const result = await prisma.$executeRaw`
          UPDATE User
          SET userTypeId = ${userType.id}, updatedAt = NOW()
          WHERE userType = ${userType.name}
        `;

        if (result > 0) {
          console.log(`  ✅ Updated ${result} user(s) for type "${userType.name}"`);
          updatedCount += result;
        } else {
          console.log(`  ℹ️  No users found for type "${userType.name}" (may have been assigned differently)`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to update users for type "${userType.name}":`, err.message);
        throw err;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} user record(s) with UserType links\n`);

    // Step 4: Verify migration using raw SQL
    console.log('✔️  Verifying migration...');
    const userTypesCount = await prisma.userType.count();

    const usersWithTypeResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM User WHERE userTypeId IS NOT NULL
    `;
    const usersWithTypeCount = usersWithTypeResult[0].count;

    const usersWithOldTypeResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM User WHERE userType IS NOT NULL
    `;
    const usersWithOldTypeCount = usersWithOldTypeResult[0].count;

    console.log(`  📊 Total UserType records: ${userTypesCount}`);
    console.log(`  📊 Users linked to UserType: ${usersWithTypeCount}`);
    console.log(`  ⚠️  Users with old userType field: ${usersWithOldTypeCount}`);

    if (usersWithOldTypeCount > 0) {
      console.log(`\n⚠️  NOTE: ${usersWithOldTypeCount} user(s) still have the old userType field.`);
      console.log('    This can be cleaned up later if needed.\n');
    }

    console.log('✅ Migration completed successfully!\n');

    // Step 5: Summary
    console.log('📋 Summary:');
    console.log(`  • UserType records created: ${createdUserTypes.length}`);
    console.log(`  • Users updated: ${updatedCount}`);
    console.log('\nℹ️  The old "user_type_cost_codes" setting can be removed from the Setting table if desired.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateUserTypes();
