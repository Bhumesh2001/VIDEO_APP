const mongoose = require('mongoose');
const crypto = require('crypto');

const algorithm = process.env.ALGORITHM;
const secretKey = process.env.SECRET_KEY_;
const ivLength = Number(process.env.IV_LENGTH);

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        minlength: [4, 'Username must be at least 4 characters long'],
        maxlength: [20, 'Username must not exceed 20 characters'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        validate: {
            validator: function (v) {
                return /^\+?[1-9]\d{1,14}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        },
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'moderator'],
        default: 'admin',
    },
    profilePicture: {
        url: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(v);
                },
                message: props => `${props.value} is not a valid image URL!`
            },
            default: 'https://example.com/default-profile-picture.png',
        },
        public_id: {
            type: String,
            required: [true, 'public_id is required!'],
        }
    },
}, { timestamps: true });

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
