// generate code
function generateCode(length = 6) {
    const min = Math.pow(10, length - 1); // Minimum value with the specified number of digits
    const max = Math.pow(10, length) - 1; // Maximum value with the specified number of digits
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = { generateCode };
