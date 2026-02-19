/**
 * Password utility functions for password management
 */

/**
 * Generate temporary password
 * Fixed password: Truda123
 *
 * This approach:
 * - Is memorable (company name + simple number)
 * - Meets all password requirements (uppercase, lowercase, number)
 * - Same for all users - avoids typos
 * - Users login with username + Truda123
 * - Opens password change modal on first login
 * - Users must set their own password
 */
function generateTemporaryPassword() {
  return 'Truda123';
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - (Optional) At least one special character
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if two passwords match (for confirmation)
 */
function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword && password && password.length > 0;
}

module.exports = {
  generateTemporaryPassword,
  validatePasswordStrength,
  passwordsMatch
};
