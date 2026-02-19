const fs = require('fs');

const data = JSON.parse(fs.readFileSync('cost-codes-test.json', 'utf8'));

console.log('\n' + '='.repeat(80));
console.log('📋 COST CODE EXTRACTION - DETAILED REVIEW');
console.log('='.repeat(80));

console.log(`\n📊 Summary:`);
console.log(`   Total Codes: ${data.totalUniqueCodes}`);
console.log(`   Total Groups: ${data.groups}`);
console.log(`   Extracted: ${data.extractedAt}`);

console.log(`\n📁 Codes by Group:`);
Object.entries(data.costCodesByGroup).forEach(([group, codes]) => {
  console.log(`\n   ${group}: ${codes.length} codes`);
  codes.slice(0, 5).forEach(code => {
    console.log(`      ✓ ${code.fullCode}`);
    console.log(`        → Branch: ${code.branch}, Found in: [${code.foundInBranches.join(', ')}]`);
  });
  if (codes.length > 5) {
    console.log(`      ... and ${codes.length - 5} more`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('✅ Data looks good? If yes, run: npm run load-cost-codes');
console.log('='.repeat(80) + '\n');
