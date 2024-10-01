const mongoose = require('mongoose');

const CouponApplicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    couponCode: {
        type: String,
        required: true,
        trim: true,
    },
    finalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ['applied', 'expired', 'used', 'invalid'],
        default: 'applied',
    },
    appliedDate: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

CouponApplicationSchema.index({ couponCode: 1, userId: 1, status: 1, appliedDate: 1 });

module.exports = mongoose.model('CouponApplication', CouponApplicationSchema);
