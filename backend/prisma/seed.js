const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create Chad (superadmin) with original password hash
  const chad = await prisma.user.create({
    data: {
      id: 'cmkv0u20o0000vc4wsipbvxmk',
      username: 'Chad',
      email: 'chadupton24@gmail.com',
      passwordHash: '$2a$10$lIEnK/i6WtgC6A7Kg0CWOunHAkW83V5IZ7N0thJJEKLEBkoOULk9S',
      firstName: 'Chad',
      lastName: 'Upton',
      role: 'ADMIN',
      branch: 'ALL',
      assignedCostCodes: '[]',
      assignedGroups: null,
      isActive: true,
      passwordMustChange: false
    }
  });

  console.log('✅ Chad (superadmin) recreated with original login details');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
