const crypto = require('crypto');

exports.generateRandomEmail = () => {
    const randomString = crypto.randomBytes(6).toString('hex');
    const emailDomain = ['gmail.com'];
    const email = `${randomString}@${emailDomain[Math.floor(Math.random() * emailDomain.length)]}`;

    return email;
};

exports.generateRandomMobileNumber = () => {
    const startDigit = Math.floor(Math.random() * 4) + 6;
    const remainingDigits = Math.floor(100000000 + Math.random() * 900000000);

    return `${startDigit}${remainingDigits}`;
};