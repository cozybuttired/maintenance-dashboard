/**
 * Load cost codes from extracted JSON into MySQL
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('crypto').randomUUID;

const prisma = new PrismaClient();

async function loadCostCodes() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📥 LOADING COST CODES INTO MYSQL');
    console.log('='.repeat(70) + '\n');

    // Read the extracted cost codes
    const testFile = path.join(__dirname, 'cost-codes-test.json');
    const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));

    console.log(`📊 Found ${data.totalUniqueCodes} cost codes from extraction\n`);

    // 1. Create Groups
    console.log('📝 Creating Groups...');
    const groupMap = {};
    const groupPromises = [];

    Object.keys(data.costCodesByGroup).forEach(groupName => {
      const groupId = require('crypto').randomUUID();
      groupMap[groupName] = groupId;

      groupPromises.push(
        prisma.group.upsert({
          where: { name: groupName },
          update: {},
          create: {
            id: groupId,
            name: groupName,
            isActive: true
          }
        }).then(() => {
          console.log(`   ✅ ${groupName}`);
        })
      );
    });

    await Promise.all(groupPromises);

    // 2. Create Cost Codes
    console.log('\n📝 Creating Cost Codes...');
    const costCodePromises = [];
    let createdCount = 0;
    let duplicateCount = 0;

    Object.entries(data.costCodesByGroup).forEach(([groupName, codes]) => {
      const groupId = groupMap[groupName];

      codes.forEach(code => {
        const costCodeId = require('crypto').randomUUID();

        costCodePromises.push(
          prisma.costCode.upsert({
            where: { code: code.fullCode },
            update: {},
            create: {
              id: costCodeId,
              code: code.fullCode,
              groupId: groupId,
              branch: code.branch,
              isActive: true
            }
          }).then((result) => {
            if (result) createdCount++;
          }).catch((error) => {
            if (error.code === 'P2002') {
              duplicateCount++;
            } else {
              throw error;
            }
          })
        );
      });
    });

    await Promise.all(costCodePromises);

    // 3. Verify counts
    console.log('\n📊 Verifying data...');
    const groupCount = await prisma.group.count();
    const costCodeCount = await prisma.costCode.count();

    console.log(`   ✅ Groups created: ${groupCount}`);
    console.log(`   ✅ Cost codes created: ${costCodeCount}`);

    // 4. Show summary by group
    console.log('\n📋 Summary by Group:');
    const groups = await prisma.group.findMany({
      include: {
        costCodes: {
          select: { id: true }
        }
      }
    });

    groups.forEach(group => {
      console.log(`   • ${group.name}: ${group.costCodes.length} codes`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ COST CODES LOADED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`\n📈 Total Groups: ${groupCount}`);
    console.log(`📈 Total Cost Codes: ${costCodeCount}`);
    console.log('\n✨ Ready to use! Cost codes are now available in the database.\n');

  } catch (error) {
    console.error('\n❌ Error loading cost codes:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

loadCostCodes();
