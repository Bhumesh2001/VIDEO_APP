const mongoose = require('mongoose');
const validator = require('validator');

const ContactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    phone: {
        type: String,
    },
    address: {
        city: {
            type: String,
        },
        district: {
            type: String,
        },
        state: {
            type: String,
        },
        country: {
            type: String,
        },
        pincode: {
            type: String,
        },
    },
    message: {
        type: String,
    },
}, { timestamps: true });

ContactSchema.index({ userId: 1 });
ContactSchema.index({ email: 1 }, { unique: true });
ContactSchema.index({ phone: 1 }, { unique: true });

const ContactModel = mongoose.model('Contact', ContactSchema);

module.exports = ContactModel;
