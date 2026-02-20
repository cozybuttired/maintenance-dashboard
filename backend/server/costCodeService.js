/**
 * Cost Code Service
 * Handles cost code normalization, deduplication, and fuzzy matching
 * across branches with different prefixes, including typo tolerance
 */

const BRANCH_PREFIXES = ['PMB', 'PTA', 'QTN', 'CPT'];
const SIMILARITY_THRESHOLD = 0.85; // 85% match required for fuzzy matching

class CostCodeService {
  /**
   * Calculate Levenshtein distance between two strings
   * Measures how different two strings are (number of edits needed)
   * Used for fuzzy matching to handle typos
   *
   * Examples:
   * "MECHANICAL" vs "MECANICAL" = 1 (one character difference)
   * "MAINTENANCE" vs "MAINTENENCE" = 1 (one character difference)
   */
  levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    // Initialize first row
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    // Initialize first column
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i][j - 1] + 1,      // Deletion
          matrix[i - 1][j] + 1,      // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    return matrix[len2][len1];
  }

  /**
   * Calculate similarity between two strings (0 to 1)
   * 1 = identical, 0 = completely different
   */
  calculateSimilarity(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1; // Both empty strings are identical

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Find the best match for a code among assigned codes
   * Returns the assigned code if exact match or close match (>= SIMILARITY_THRESHOLD)
   * Returns null if no good match found
   */
  findBestMatch(recordCode, assignedCodes) {
    const normalized = this.normalize(recordCode);

    // First, try exact match
    for (const assigned of assignedCodes) {
      if (this.normalize(assigned) === normalized) {
        return assigned;
      }
    }

    // If no exact match, try fuzzy matching
    let bestMatch = null;
    let bestSimilarity = SIMILARITY_THRESHOLD; // Only accept matches above threshold

    for (const assigned of assignedCodes) {
      const normalizedAssigned = this.normalize(assigned);
      const similarity = this.calculateSimilarity(normalized, normalizedAssigned);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = assigned;
      }
    }

    return bestMatch;
  }

  /**
   * Normalize a cost code for COMPARISON (aggressive normalization)
   * - Strip branch prefix (PMB-, PTA-, etc.)
   * - Trim whitespace
   * - Convert to uppercase
   * - Remove all special characters and spaces
   * - Only keep alphanumeric characters
   *
   * Examples:
   * "PMB-MNT-001" -> "MNT001"
   * " MNT - 001 " -> "MNT001"
   * "PTA-ELEC-002" -> "ELEC002"
   * "PMB - Mechanical Maintenance" -> "MECHANICALMAINTENANCE"
   * "PMB-DAFF/ROMAINTENANCE" -> "DAFFROMAINTENANCE"
   */
  normalize(costCode) {
    if (!costCode) return '';

    // Trim whitespace
    let normalized = costCode.trim();

    // Convert to uppercase
    normalized = normalized.toUpperCase();

    // Remove branch prefix if present (e.g., "PMB-", "PTA-", "PMB ", "PTA ")
    for (const prefix of BRANCH_PREFIXES) {
      // Handle both "PMB-" and "PMB " with spaces
      if (normalized.startsWith(prefix + '-') || normalized.startsWith(prefix + ' ')) {
        normalized = normalized.substring(prefix.length + 1).trim();
        break;
      }
    }

    // Remove ALL special characters, spaces, and dashes - only keep alphanumeric
    // This handles: dashes, slashes, ampersands, spaces, etc.
    normalized = normalized.replace(/[^A-Z0-9]/g, '');

    return normalized;
  }

  /**
   * Normalize a cost code for DISPLAY (lighter normalization, keeps some structure)
   * Keeps the cost code readable while normalizing formatting
   *
   * Examples:
   * "PMB - Mechanical Maintenance" -> "PMB-MECHANICAL MAINTENANCE"
   * "PMB-DAFF/ROMAINTENANCE" -> "PMB-DAFF/ROMAINTENANCE" (no change needed)
   */
  normalizeForDisplay(costCode) {
    if (!costCode) return '';

    let normalized = costCode.trim().toUpperCase();

    // Normalize spacing around dashes
    normalized = normalized.replace(/\s*-\s*/g, '-');

    return normalized;
  }

  /**
   * Get the base cost code (normalized, without branch)
   */
  getBaseCode(costCode) {
    return this.normalize(costCode);
  }

  /**
   * Check if two cost codes match (after normalization)
   * Handles fuzzy matching for whitespace variations
   */
  codesMatch(code1, code2) {
    return this.normalize(code1) === this.normalize(code2);
  }

  /**
   * Deduplicate cost codes across branches
   * Takes raw cost codes from database and returns unique original codes
   * Uses normalized form for deduplication but returns original readable form
   *
   * Example:
   * Input: ['PMB-MNT-001', 'PTA-MNT-001', 'QTN-ELEC-001', 'PTA-ELEC-001']
   * Output: ['PMB-MNT-001', 'QTN-ELEC-001'] (keeps first occurrence of each normalized form)
   */
  deduplicateCodes(costCodes) {
    const seen = new Set();
    const unique = [];

    costCodes.forEach(code => {
      const normalized = this.normalize(code);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        unique.push(code);  // ✅ Push original code, not normalized
      }
    });

    return unique.sort();
  }

  /**
   * Filter records by assigned cost codes (with fuzzy matching for typos)
   * - First tries exact match (after normalization)
   * - If no exact match, tries fuzzy matching (handles typos)
   * - Uses Levenshtein distance with configurable threshold
   * - If user has empty array or null, they see all records
   */
  filterByAssignedCodes(records, assignedCodes) {
    // Empty array or null = access to all codes
    if (!assignedCodes || assignedCodes.length === 0) {
      return records;
    }

    // Filter records - keep only those where record's cost code matches assigned codes
    return records.filter(record => {
      const match = this.findBestMatch(record.costCode, assignedCodes);
      return match !== null;
    });
  }

  /**
   * Group cost codes by category (extracted from code prefix)
   * Examples:
   * - MNT-* -> General Maintenance
   * - ELEC-* -> Electrical
   * - PLUMB-* -> Plumbing
   */
  getCategoryFromCode(costCode) {
    const normalized = this.normalize(costCode);
    const prefix = normalized.split('-')[0];

    const categoryMap = {
      'MNT': 'General Maintenance',
      'ELEC': 'Electrical',
      'PLUMB': 'Plumbing',
      'HVAC': 'HVAC',
      'FLOOR': 'Flooring',
      'ROOF': 'Roofing'
    };

    return categoryMap[prefix] || 'Other';
  }

  /**
   * Format cost code for display
   * Adds category info if requested
   */
  formatForDisplay(costCode, includeCategory = false) {
    const normalized = this.normalize(costCode);
    if (includeCategory) {
      const category = this.getCategoryFromCode(normalized);
      return `${normalized} (${category})`;
    }
    return normalized;
  }

  /**
   * Get matching details for debugging/logging
   * Shows which assigned codes matched which record codes and similarity percentage
   */
  getMatchDetails(records, assignedCodes) {
    if (!assignedCodes || assignedCodes.length === 0) {
      return [];
    }

    const details = [];

    records.forEach(record => {
      const match = this.findBestMatch(record.costCode, assignedCodes);
      if (match) {
        const similarity = this.calculateSimilarity(
          this.normalize(record.costCode),
          this.normalize(match)
        );
        details.push({
          recordCode: record.costCode,
          assignedCode: match,
          similarity: (similarity * 100).toFixed(1) + '%',
          isExactMatch: this.normalize(record.costCode) === this.normalize(match)
        });
      }
    });

    return details;
  }

  /**
   * Group cost codes by category
   */
  groupByCategory(costCodes) {
    const grouped = {};

    costCodes.forEach(code => {
      const category = this.getCategoryFromCode(code);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(code);
    });

    return grouped;
  }

  /**
   * Extract branch ownership from cost code prefix
   * Examples:
   * "PMB-MNT-001" → "PMB"
   * "MNT-001" → null (no branch prefix)
   */
  extractBranchFromCode(costCode) {
    const normalized = costCode.trim().toUpperCase();
    for (const branch of BRANCH_PREFIXES) {
      // Support both "QTN-" and "QTN " (dash and space separators)
      if (normalized.startsWith(branch + '-') || normalized.startsWith(branch + ' ')) {
        return branch;
      }
    }
    return null;
  }

  /**
   * Check if cost code belongs to a specific branch
   */
  codeOwnedByBranch(costCode, branch) {
    const owningBranch = this.extractBranchFromCode(costCode);
    return owningBranch === branch;
  }

  /**
   * Get cost codes for a specific branch from a list
   * Returns cost codes that either:
   * - Have the branch prefix, OR
   * - Have no prefix (generic codes)
   */
  getCostCodesForBranch(costCodes, branch) {
    return costCodes.filter(code => {
      const owningBranch = this.extractBranchFromCode(code);
      return owningBranch === branch || owningBranch === null;
    });
  }
}

module.exports = new CostCodeService();
