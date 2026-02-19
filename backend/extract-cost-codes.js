/**
 * Cost Code Extraction Script
 * Extracts all unique cost codes from MSSQL branches
 * Creates a test output for review before loading to MySQL
 */

require('dotenv').config();
const dbManager = require('./server/dbManager');
const costCodeService = require('./server/costCodeService');
const fs = require('fs');
const path = require('path');

const BRANCH_PREFIXES = ['PMB', 'PTA', 'QTN', 'CPT'];

async function extractCostCodes() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 COST CODE EXTRACTION - TEST RUN');
  console.log('='.repeat(70) + '\n');

  try {
    // Query to get all distinct groups and cost codes
    const query = `
      SELECT DISTINCT
        [GROUP] as [group],
        [COST CODE] as [costCode]
      FROM [dbo].[TNT_vw_MaintenancePurchases]
      WHERE [GROUP] IS NOT NULL
        AND [COST CODE] IS NOT NULL
      ORDER BY [GROUP], [COST CODE]
    `;

    console.log('📊 Querying all branches...\n');

    // Query all branches
    const results = await dbManager.queryAllBranches(query);

    // Parse results
    const costCodeMap = new Map(); // key: normalizedCode, value: full details
    const branchResults = {};

    results.forEach((result, index) => {
      const branch = result.branch;
      branchResults[branch] = {
        success: result.success,
        recordCount: result.data?.length || 0,
        codes: []
      };

      if (result.success && result.data) {
        console.log(`\n✅ ${branch}: ${result.data.length} records found`);

        let addedCount = 0;
        result.data.forEach(record => {
          const group = record.group?.trim() || 'Unknown';
          const rawCode = record.costCode?.trim() || '';

          if (!rawCode) return;

          addedCount++;

          // Clean whitespace in code
          let cleanedCode = rawCode.replace(/\s+/g, ' ').trim();

          // Fix character encoding issues (UTF-8 mangling)
          // Replace weird characters like â€" with proper dash
          cleanedCode = cleanedCode.replace(/â€"|\u2013|\u2014|â€"/g, '-');
          cleanedCode = cleanedCode.replace(/â€˜|â€™|â€œ|â€\u009d/g, '"');
          cleanedCode = cleanedCode.replace(/â„¢/g, '™');

          // Clean up any other UTF-8 mojibake patterns
          cleanedCode = cleanedCode.replace(/â€[^;]*;?/g, '-');

          // Normalize CT → CPT (CT was used to represent CPT)
          cleanedCode = cleanedCode.replace(/\bCT\b/g, 'CPT');
          cleanedCode = cleanedCode.replace(/^CT-/i, 'CPT-');
          cleanedCode = cleanedCode.replace(/^CT\s/i, 'CPT ');

          // Extract branch prefix if present
          let extractedBranch = null;
          let baseCode = cleanedCode;

          for (const prefix of BRANCH_PREFIXES) {
            const patterns = [
              `${prefix}-`,
              `${prefix} -`,
              `${prefix} `
            ];

            for (const pattern of patterns) {
              if (cleanedCode.toUpperCase().startsWith(pattern.toUpperCase())) {
                extractedBranch = prefix;
                baseCode = cleanedCode.substring(pattern.length).trim();
                break;
              }
            }
            if (extractedBranch) break;
          }

          // Use the extracted branch if present, otherwise keep as generic code without branch prefix
          const codeBranch = extractedBranch;

          // Use original cleaned code as fullCode (don't add branch prefixes that don't exist)
          const fullCode = cleanedCode;

          // Normalize for deduplication
          const normalized = costCodeService.normalize(fullCode);

          // Key for deduplication: use group + normalized code so same code in different groups is kept separate
          const key = `${group}||${normalized}`;

          if (!costCodeMap.has(key)) {
            costCodeMap.set(key, {
              fullCode: fullCode,
              baseCode: baseCode,
              branch: codeBranch, // Will be null if no branch prefix
              group: group,
              normalized: normalized,
              foundInBranches: [branch], // Track all branches where found
              rawSources: [{ branch: branch, originalCode: rawCode }]
            });
            branchResults[branch].codes.push(fullCode);
          } else {
            // Track if same code appears in multiple branches in same group
            const existing = costCodeMap.get(key);
            const alreadyRecorded = existing.foundInBranches.includes(branch);
            if (!alreadyRecorded) {
              existing.foundInBranches.push(branch);
              existing.rawSources.push({ branch: branch, originalCode: rawCode });
            }
          }
        });
      } else {
        console.log(`❌ ${branch}: Failed - ${result.error}`);
      }
    });

    // Organize by group
    const byGroup = {};
    costCodeMap.forEach((code) => {
      if (!byGroup[code.group]) {
        byGroup[code.group] = [];
      }
      byGroup[code.group].push({
        fullCode: code.fullCode,
        baseCode: code.baseCode,
        branch: code.branch,
        group: code.group,
        normalized: code.normalized,
        foundInBranches: code.foundInBranches
      });
    });

    // Sort groups and codes
    Object.keys(byGroup).forEach(group => {
      byGroup[group].sort((a, b) => a.fullCode.localeCompare(b.fullCode));
    });

    // Create summary
    const summary = {
      extractedAt: new Date().toISOString(),
      totalUniqueCodes: costCodeMap.size,
      groups: Object.keys(byGroup).length,
      branchSummary: branchResults,
      costCodesByGroup: byGroup
    };

    // Write to file
    const outputPath = path.join(__dirname, 'cost-codes-test.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📈 EXTRACTION SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Total Unique Cost Codes: ${summary.totalUniqueCodes}`);
    console.log(`✅ Total Groups: ${summary.groups}`);
    console.log(`\n📋 Groups Found:`);
    Object.keys(byGroup).forEach(group => {
      console.log(`   • ${group}: ${byGroup[group].length} codes`);
    });

    console.log('\n📊 Branch Summary:');
    Object.entries(branchResults).forEach(([branch, data]) => {
      const icon = data.success ? '✅' : '❌';
      console.log(`   ${icon} ${branch}: ${data.recordCount} records, ${data.codes.length} unique codes`);
    });

    console.log(`\n💾 Test file saved: ${outputPath}`);
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Review the test file for accuracy');
    console.log('   2. Check that branch prefixes are correct (PMB, PTA, QTN, CPT)');
    console.log('   3. Verify group names and cost code formatting');
    console.log('   4. If looks good, run: npm run load-cost-codes');
    console.log('\n' + '='.repeat(70) + '\n');

    // Also show a sample of data
    console.log('🔍 SAMPLE DATA (first 5 codes from first group):');
    const firstGroup = Object.keys(byGroup)[0];
    if (firstGroup) {
      console.log(`\n${firstGroup}:`);
      byGroup[firstGroup].slice(0, 5).forEach(code => {
        console.log(`   • ${code.fullCode} (Branch: ${code.branch}, Found in: ${code.foundInBranches.join(', ')})`);
      });
    }

  } catch (error) {
    console.error('\n❌ Extraction error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await dbManager.closeAllPools();
  }
}

extractCostCodes();
