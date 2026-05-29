/**
 * Formats a Date object to 'YYYY-MM-DD' string format in local timezone.
 * @param {Date} date
 * @returns {string}
 */
const getTodayString = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const day = parts.find(p => p.type === 'day').value;
  const month = parts.find(p => p.type === 'month').value;
  const year = parts.find(p => p.type === 'year').value;
  return `${year}-${month}-${day}`;
};

/**
 * Returns the start and end Date objects for a given month and year.
 * @param {number} month - 1-indexed (1-12)
 * @param {number} year
 * @returns {{start: Date, end: Date}}
 */
const getStartAndEndOfMonth = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

module.exports = {
  getTodayString,
  getStartAndEndOfMonth,
};
