const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [30, 'Name cannot exceed 30 characters'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    password: {
        type: String,
        default: "",
    },
    mobileNumber: {
        type: String,
        required: [true, 'Mobile number is required'],
        unique: true,
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props =>
                `${props.value} is not a valid mobile number! Mobile number should be 10 digits.`,
        }
    },
    otp: {
        type: String,
    },
    otpExpiration: {
        type: Date
    },
    role: {
        type: String,
        enum: ['user'],
        default: 'user',
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    profile_Picture: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ mobileNumber: 1 }, { unique: true });
userSchema.index({ timestamps: 1 });

userSchema.pre('save', async function (next) {
    const user = this;
    user.updatedAt = new Date();
    if (!user.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateProfilePicture = async function (url) {
    this.profilePicture = url;
    await this.save();
};

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;