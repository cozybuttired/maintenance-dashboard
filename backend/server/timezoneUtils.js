/**
 * Timezone utility for SAST (South Africa Standard Time - UTC+2)
 * Converts timestamps to SAST format for consistent display across app
 */

// Get current time in SAST timezone
const getSASTTime = () => {
  const now = new Date();
  // Convert to SAST (UTC+2)
  return new Date(now.getTime() + (2 * 60 * 60 * 1000));
};

// Format date as ISO string in SAST timezone
const getSASTISOString = (date = new Date()) => {
  const d = new Date(date);
  const sast = new Date(d.getTime() + (2 * 60 * 60 * 1000));

  // Get UTC ISO string and replace Z with +02:00
  const iso = sast.toISOString();
  return iso.slice(0, -1) + '+02:00';
};

// Format for logging: [2026-02-20T14:07:48.134+02:00]
const getSASTLogTime = (date = new Date()) => {
  const d = new Date(date);
  const sast = new Date(d.getTime() + (2 * 60 * 60 * 1000));

  const year = sast.getUTCFullYear();
  const month = String(sast.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sast.getUTCDate()).padStart(2, '0');
  const hours = String(sast.getUTCHours()).padStart(2, '0');
  const minutes = String(sast.getUTCMinutes()).padStart(2, '0');
  const seconds = String(sast.getUTCSeconds()).padStart(2, '0');
  const ms = String(sast.getUTCMilliseconds()).padStart(3, '0');

  return `[${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+02:00]`;
};

module.exports = {
  getSASTTime,
  getSASTISOString,
  getSASTLogTime
};
