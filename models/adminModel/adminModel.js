const mongoose = require('mongoose');
const crypto = require('node:crypto');

const algorithm = process.env.ALGORITHM;
const secretKey = process.env.SECRET_KEY_;
const ivLength = Number(process.env.IV_LENGTH);

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        trim: true,
        index: true, // Index for fast search
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        index: true, // Index for fast search
    },
    password: {
        type: String,
    },
    phone: {
        type: String,
        unique: true,
        index: true, // Index for fast search
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'moderator'],
        default: 'admin',
        index: true, // Index for role-based searches
    },
    profilePicture: {
        url: {
            type: String,
            default: 'https://example.com/default-profile-picture.png',
        },
        public_id: {
            type: String,
            index: true, // Index for searching by public_id if required
        }
    },
}, { timestamps: true });

// Adding compound index to improve performance for username & email lookups
adminSchema.index({ username: 1, email: 1 });

// Adding compound index for phone & role search (if needed for queries)
adminSchema.index({ phone: 1, role: 1 });

// Method to encrypt password
adminSchema.methods.encryptPassword = function (password) {
    const iv = crypto.randomBytes(ivLength); // Create an initialization vector
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'utf8'), iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
};

adminSchema.methods.comparePassword = function (candidatePassword) {
    try {
        // Split the IV and the encrypted password
        const textParts = this.password.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex'); // Extract the IV
        const encryptedPassword = Buffer.from(textParts.join(':'), 'hex'); // Extract the encrypted part

        // Create a decipher using the algorithm, secret key, and IV
        const decipher = crypto.createDecipheriv(process.env.ALGORITHM, Buffer.from(process.env.SECRET_KEY_, 'utf8'), iv);

        // Decrypt the stored password
        let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // Compare the decrypted password with the candidate password
        return decrypted === candidatePassword;
    } catch (error) {
        console.error('Error comparing passwords:', error);
        return false; // Return false if any error occurs
    }
};

// Validate secret key length before encrypting
if (Buffer.from(secretKey, 'utf8').length !== 32) {
    throw new Error('Invalid secret key length. Must be 32 bytes for AES-256.');
};

// Method to decrypt password
adminSchema.methods.decryptPassword = function () {
    const textParts = this.password.split(':'); // Split the IV and encrypted text
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'utf8'), iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

// Middleware to encrypt password before saving to the database
adminSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = this.encryptPassword(this.password);
    }
    next();
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
