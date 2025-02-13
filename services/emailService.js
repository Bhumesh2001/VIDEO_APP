const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { SmtpEmailSettings } = require("../models/adminModel/settingModel");

let EMAIL = "";
let EMAIL_PASSWORD = "";
let transporter = null;

// 📌 Function to Load SMTP Credentials Only Once
const getSmtpCredentials = async () => {
    try {
        if (!mongoose.connection.readyState) {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait before retrying
        }

        // 🔹 Fetch SMTP credentials only if not already fetched
        if (!EMAIL || !EMAIL_PASSWORD) {
            const data = await SmtpEmailSettings.findOne({}, { smtpEmail: 1, smtpPassword: 1 }).lean();
            if (!data) throw new Error("SMTP credentials not found in DB!");

            EMAIL = data.smtpEmail;
            EMAIL_PASSWORD = data.smtpPassword;
            initializeTransporter();
        }
    } catch (error) {
        console.error("Error Fetching SMTP Credentials:", error.message);
    }
};

// 📌 Function to Initialize Transporter (Singleton)
const initializeTransporter = () => {
    if (!EMAIL || !EMAIL_PASSWORD) {
        console.error("❌ SMTP Credentials Missing! Transporter not initialized.");
        return;
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: EMAIL, pass: EMAIL_PASSWORD },
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
        });
    }
};

// 📌 Ensure Credentials Load on App Start (Only Once)
(async () => {
    await getSmtpCredentials();
})();

// 📌 Get Transporter (Ensures it's Always Available)
const getTransporter = () => {
    if (!transporter) {
        console.error("⚠️ Transporter not initialized. Fetching credentials again...");
        getSmtpCredentials();
    }
    return transporter;
};

// 📌 Universal Function to Replace Placeholders in Email Templates
const replacePlaceholders = (html, data) => {
    return html.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || "");
};

// 📌 Universal Function to Send Emails
const sendEmail = async (email, data, templateName) => {
    const transporter = getTransporter();
    if (!transporter) {
        console.error("❌ Email sending failed: Transporter is not available.");
        return;
    }

    try {
        const templatePath = path.join(__dirname, "..", "templates", `${templateName}.html`);
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

        let emailTemplate = fs.readFileSync(templatePath, "utf8");
        emailTemplate = replacePlaceholders(emailTemplate, data);

        const mailOptions = {
            from: EMAIL,
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
