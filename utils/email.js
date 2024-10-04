const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Set up your transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    }
});

// Function to send email
exports.sendNotification = async (email, data) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: data.subject,
        text: data.text
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}`);
    } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
    }
};

// Generate rondome email address
exports.generateRandomEmail = () => {
    const randomString = crypto.randomBytes(6).toString('hex');
    const emailDomain = ['gmail.com'];
    const email = `${randomString}@${emailDomain[Math.floor(Math.random() * emailDomain.length)]}`;

    return email;
};

// Generate rondome mobaile number
exports.generateRandomMobileNumber = () => {
    const startDigit = Math.floor(Math.random() * 4) + 6;
    const remainingDigits = Math.floor(100000000 + Math.random() * 900000000);

    return `${startDigit}${remainingDigits}`;
};
