const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'moderator'],
        default: 'admin',
    },
    profilePicture: {
        type: String,
        validate: {
            validator: function (v) {
                return /^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(v);
            },
            message: props => `${props.value} is not a valid image URL!`
        },
        default: 'https://example.com/default-profile-picture.png',
    },
},{ timestamps: true }
);

adminSchema.pre('save', async function (next) {
    try {
        if (this.isModified('password') || this.isNew) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
        this.updatedAt = Date.now();
        next();
    } catch (error) {
        next(error);
    };
});

adminSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

adminSchema.method.updateProfilePicture = async (url) => {
    this.profilePicture = url;
    await this.save();
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
