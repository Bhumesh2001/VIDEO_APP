const mongoose = require('mongoose');

const CouponApplicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    couponCode: {
        type: String,
    },
    discount: {
        type: Number,
        default: 0,
    },
    finalPrice: {
        type: Number,
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
