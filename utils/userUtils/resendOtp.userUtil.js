/**
 * Generates a random verification code with a specified length.
 * The default length is 6 digits.
 * 
 * @param {number} length - The length of the verification code. Default is 6.
 * @returns {number} - A random integer verification code.
 */
function generateCode(length = 6) {
    const min = Math.pow(10, length - 1); // Minimum value with the specified number of digits
    const max = Math.pow(10, length) - 1; // Maximum value with the specified number of digits
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = { generateCode };