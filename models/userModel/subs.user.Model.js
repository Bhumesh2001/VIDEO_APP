const mongoose = require('mongoose');
const { Schema } = mongoose;

const SingleCategorySubscriptionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    planName: {
        type: String,
        required: [true, 'Plan is required'],
    },
    planType: {
        type: String,
        required: true,
    },
    totalPrice: {
        type: Number,
        require: [true, 'toatalPrice is required!'],
    },
    discountFromPlan: {
        type: Number,
        default: 0, 
        min: [0, 'Discount from plan cannot be less than 0'],
        max: [100, 'Discount from plan cannot exceed 100'],
        validate: {
            validator: function (v) {
                return v % 1 === 0;
            },
            message: 'Discount from plan must be a whole number',
        },
    },
    discountFromCoupon: {
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
    discountedPrice: {
        type: Number,
        required: [true, 'discountedPrice is required'],
        min: [0, 'discountedPrice cannot be less than 0'],
    },
    paymentGetway: {
        type: String,
        default: '',
    },
    paymentId: {
        type: String,
        unique: true,
        default: '',
    },
    startDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    expiryDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'expired'],
        default: 'active',
    },
}, { timestamps: true });

SingleCategorySubscriptionSchema.index({ userId: 1 });
SingleCategorySubscriptionSchema.index({ categoryId: 1 });
SingleCategorySubscriptionSchema.index({ paymentGetway: 1 });

function calculateExpiryDate(startDate, planType) {
    const expiryDate = new Date(startDate);
    switch (planType) {
        case 'monthly':
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            break;
        case 'quarterly':
            expiryDate.setMonth(expiryDate.getMonth() + 3);
            break;
        case 'yearly':
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            break;
        default:
            throw new Error('Invalid planType');
    };
    return expiryDate;
};

SingleCategorySubscriptionSchema.pre('save', function (next) {
    this.expiryDate = calculateExpiryDate(this.startDate, this.planType);
    next();
});

SingleCategorySubscriptionSchema.methods.calculateFinalPrice = function () {
    const totalDiscountPercentage = this.discountFromPlan + this.discountFromCoupon;
    const discountAmount = (this.totalPrice * totalDiscountPercentage) / 100;
    this.discountedPrice = this.totalPrice - discountAmount;
};

const SingleCategorySubscriptionModel = mongoose.model('SingleCategorySubscription', SingleCategorySubscriptionSchema);

module.exports = SingleCategorySubscriptionModel;