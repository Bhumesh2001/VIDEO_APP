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
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount from coupon cannot be less than 0'],
        max: [100, 'Discount from coupon cannot exceed 100'],
        validate: {
            validator: function (v) {
                return v % 1 === 0;
            },
            message: 'Discount from coupon must be a whole number',
        },
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
