/**
 * Convert extracted cost codes to CSV format for review
 */

const fs = require('fs');
const path = require('path');

async function createCSV() {
  try {
    console.log('\n📊 Creating CSV file...\n');

    // Read the test JSON file
    const testFile = path.join(__dirname, 'cost-codes-test.json');
    const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));

    // Prepare CSV rows
    const csvRows = [
      ['Group', 'Full Code', 'Base Code', 'Primary Branch', 'Found In Branches', 'Normalized Code']
    ];

    // Add data rows
    Object.entries(data.costCodesByGroup).forEach(([group, codes]) => {
      codes.forEach(code => {
        csvRows.push([
          group,
          code.fullCode,
          code.baseCode,
          code.branch,
          code.foundInBranches.join(' | '),
          code.normalized
        ]);
      });
    });

    // Convert to CSV string (handle commas in data)
    const csvContent = csvRows
      .map(row =>
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(cell).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
        }).join(',')
      )
      .join('\n');

    // Write to file
    const outputPath = path.join(__dirname, 'cost-codes-review.csv');
    fs.writeFileSync(outputPath, csvContent);

    console.log(`✅ CSV file created: ${outputPath}`);
    console.log(`\n📈 Statistics:`);
    console.log(`   Total Records: ${csvRows.length - 1}`);
    console.log(`   Groups: ${Object.keys(data.costCodesByGroup).length}`);
    console.log(`\n💾 Open this file in Excel or a spreadsheet application to review`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Error creating CSV:', error.message);
    process.exit(1);
  }
}

createCSV();
