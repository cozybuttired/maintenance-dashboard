const { PrismaClient } = require('@prisma/client');

async function verify() {
  const prisma = new PrismaClient();
  try {
    console.log('\n✅ VERIFICATION\n');

    // Sample from each group
    const groups = await prisma.group.findMany({
      include: { costCodes: { take: 3 } }
    });

    groups.forEach(group => {
      console.log(`${group.name} (${group.costCodes.length} samples):`);
      group.costCodes.forEach(code => {
        console.log(`   • ${code.code}`);
      });
      console.log();
    });

    // Check a specific code
    const example = await prisma.costCode.findUnique({
      where: { code: 'PMB Fleet - Delivery/Tautliner' },
      include: { group: true }
    });

    if (example) {
      console.log(`Example Code: "${example.code}"`);
      console.log(`   Group: ${example.group.name}`);
      console.log(`   Branch: ${example.branch}`);
      console.log(`   Active: ${example.isActive}\n`);
    }

  } finally {
    await prisma.$disconnect();
  }
}

verify();
