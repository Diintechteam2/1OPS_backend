/**
 * Formats a Date object to 'YYYY-MM-DD' string format in local timezone.
 * @param {Date} date
 * @returns {string}
 */
const getTodayString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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
