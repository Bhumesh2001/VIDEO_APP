const mongoose = require('mongoose');

// Define the Coupon schema
const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        trim: true,
        uppercase: true,
    },
    expirationDate: {
        type: Date,
    },
    maxUsage: {
        type: Number,
    },
    usageCount: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        default: 'Active',
    },
}, { timestamps: true });

// Indexes
couponSchema.index({ couponCode: 1 }, { unique: true }); // Ensures unique coupon codes
couponSchema.index({ expirationDate: 1 }); // Optimizes queries by expiration date
couponSchema.index({ status: 1 }); // Optimizes filtering by status

// Pre-save hook to ensure usage count does not exceed maxUsage
couponSchema.pre('save', function (next) {
    if (this.isModified('usageCount') || this.isModified('maxUsage')) {
        if (this.usageCount > this.maxUsage) {
            return next(new Error('Usage count cannot exceed the maximum usage limit.'));
        }
    }
    next();
});

// Method to check if the coupon is expired
couponSchema.methods.isExpired = function () {
    return this.expirationDate <= Date.now();
};

// Static method to update the status of expired coupons automatically
couponSchema.statics.deactivateExpiredCoupons = async function () {
    const expiredCoupons = await this.updateMany(
        { expirationDate: { $lt: Date.now() }, status: 'Active' },
        { status: 'Inactive' }
    );
    return expiredCoupons;
};

// Automatic expiration check before saving
couponSchema.pre('save', async function (next) {
    if (this.isExpired()) {
        this.status = 'Inactive'; // Set status to inactive if expired
    }
    next();
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
