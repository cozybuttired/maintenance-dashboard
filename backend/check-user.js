const { PrismaClient } = require('@prisma/client');

async function checkUser() {
  const prisma = new PrismaClient();
  try {
    // Get the most recently created user
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (user) {
      console.log('\n👤 Latest User:');
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Branch: ${user.branch}`);
      console.log(`   Assigned Groups: ${user.assignedGroups}`);
      console.log(`   Assigned Cost Codes: ${user.assignedCostCodes}`);
      console.log();

      if (user.assignedCostCodes) {
        try {
          const codes = JSON.parse(user.assignedCostCodes);
          console.log(`   Cost Codes Count: ${codes.length}`);
          console.log(`   First 3 codes:`);
          codes.slice(0, 3).forEach(code => console.log(`     • ${code}`));
        } catch (e) {
          console.log('   Error parsing cost codes');
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
