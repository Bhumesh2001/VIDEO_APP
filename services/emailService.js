const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
    pool: true,
});

// 📌 Universal Function to Replace Placeholders in Email Templates
const replacePlaceholders = (html, data) => {
    return html.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || "");
};

// 📌 Universal Function to Send Emails
const sendEmail = async (email, data, templateName) => {
    try {
        const templatePath = path.join(__dirname, "..", "templates", `${templateName}.html`);
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

        let emailTemplate = fs.readFileSync(templatePath, "utf8");
        emailTemplate = replacePlaceholders(emailTemplate, data);

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: data.subject,
            html: emailTemplate,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`❌ Failed to send email to ${email}:`, error.message);
    }
};

// 📌 Exported Email Functions
exports.sendNotificationEmail = (email, data) => sendEmail(email, data, "reminder");
exports.sendNotificationEmail2 = (email, data) => sendEmail(email, data, "expired");
exports.sendVerificationEmail = (email, data) => sendEmail(email, data, "verification");
exports.sendOtpEmail = (email, data) => sendEmail(email, data, "otp");

// 📌 Generate Random Email Address
exports.generateRandomEmail = () => {
    return `${crypto.randomBytes(6).toString("hex")}@gmail.com`;
};

// 📌 Generate Random Mobile Number
exports.generateRandomMobileNumber = () => {
    return `${Math.floor(Math.random() * 4) + 6}${Math.floor(100000000 + Math.random() * 900000000)}`;
};
