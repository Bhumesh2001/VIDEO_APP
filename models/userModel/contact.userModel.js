const mongoose = require('mongoose');
const validator = require('validator');

const ContactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required.'],
    },
    name: {
        type: String,
        required: [true, 'Name is required.'],
        minlength: [3, 'Name must be at least 3 characters long.'],
        maxlength: [50, 'Name must be at most 50 characters long.'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required.'],
        lowercase: true,
        validate: {
            validator: (value) => validator.isEmail(value),
            message: 'Please provide a valid email address.',
        },
        trim: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required.'],
        validate: {
            validator: (value) => validator.isMobilePhone(value, 'any'),
            message: 'Please provide a valid phone number.',
        },
    },
    address: {
        city: {
            type: String,
            required: [true, 'City is required.'],
            minlength: [2, 'City must be at least 2 characters long'],
            maxlength: [50, 'City cannot be longer than 50 characters'],
            trim: true,
        },
        district: {
            type: String,
            required: [true, 'District is required.'],
            trim: true,
        },
        state: {
            type: String,
            required: [true, 'State is required.'],
            trim: true,
        },
        country: {
            type: String,
            required: [true, 'Country is required.'],
            trim: true,
        },
        pincode: {
            type: String,
            required: [true, 'Pincode is required.'],
            validate: {
                validator: (value) => validator.isPostalCode(value, 'any'),
                message: 'Please provide a valid pincode.',
            },
        },
    },
    message: {
        type: String,
        trim: true,
        minlength: [10, 'Message must be at least 10 characters long'],
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
}, { timestamps: true });

ContactSchema.index({ userId: 1 });
ContactSchema.index({ email: 1 }, { unique: true });
ContactSchema.index({ phone: 1 }, { unique: true });

const ContactModel = mongoose.model('Contact', ContactSchema);

module.exports = ContactModel;
