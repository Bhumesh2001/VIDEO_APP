const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: [true, 'Coupon code is required.'],
        unique: true,
        trim: true,
        uppercase: true,
        minlength: [5, 'Coupon code must be at least 5 characters long.'],
        maxlength: [20, 'Coupon code must not exceed 20 characters.']
    },
    discountPercentage: {
        type: Number,
        required: [true, 'Discount percentage is required.'],
        min: [0, 'Discount percentage must be at least 0%.'],
        max: [100, 'Discount percentage cannot exceed 100%.'],
    },
    expirationDate: {
        type: Date,
        required: [true, 'Expiration date is required.'],
        validate: {
            validator: function (value) {
                return value > Date.now();
            },
            message: 'Expiration date must be in the future.'
        }
    },
    maxUsage: {
        type: Number,
        required: [true, 'Maximum usage is required.'],
        min: [1, 'Maximum usage must be at least 1.']
    },
    usageCount: {
        type: Number,
        default: 0,
        validate: {
            validator: function (value) {
                return value <= this.maxUsage;
            },
            message: 'Usage count cannot exceed the maximum usage limit.'
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
}, { timestamps: true });

couponSchema.index({ couponCode: 1 }, { unique: true });

couponSchema.pre('save', function (next) {
    if (this.isModified('usageCount') || this.isModified('maxUsage')) {
        if (this.usageCount > this.maxUsage) {
            return next(new Error('Usage count cannot exceed the maximum usage limit.'));
        };
    };
    next();
});

couponSchema.methods.isExpired = function () {
    return this.expirationDate <= Date.now();
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
