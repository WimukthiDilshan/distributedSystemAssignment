/**
 * Utility functions for handling MongoDB ObjectId comparisons
 */

/**
 * Safely converts any value to a string for comparison
 * @param {*} id - Any value (ObjectId, string, etc.)
 * @returns {string} - String representation of the ID
 */
const toIdString = (id) => {
  if (!id) return '';
  
  // Check if it's a MongoDB ObjectId with toString method
  if (id.toString && typeof id.toString === 'function') {
    return id.toString();
  }
  
  // Otherwise, convert to string directly
  return String(id);
};

/**
 * Compare two IDs for equality by converting both to strings
 * @param {*} id1 - First ID to compare
 * @param {*} id2 - Second ID to compare
 * @returns {boolean} - Whether the IDs match
 */
const compareIds = (id1, id2) => {
  return toIdString(id1) === toIdString(id2);
};

module.exports = {
  toIdString,
  compareIds
}; 