const mongoose = require('mongoose');
const { Schema } = mongoose;

const AllCategorySubscriptionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'userId is required!'],
    },
    categoryId: {
        type: String,
        required: [true, 'CategoryId is required!'],
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: [true, 'PlanId is required!'],
    },
    planName: {
        type: String,
        required: [true, 'Plan is required'],
    },
    planType: {
        type: String,
        required: [true, "PlanType is required!"],
    },
    price: {
        type: Number,
        require: [true, 'price is required!'],
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
    flatDiscount: {
        type: Number,
        default: 10,
        required: true,
        min: [0, 'Discount must be at least 0%'],
        max: [100, 'Discount cannot exceed 100%'],
        validate: {
            validator: Number.isInteger,
            message: 'Discount must be an integer value.'
        }
    },
    finalPrice: {
        type: Number,
        required: [true, 'finalPrice is required'],
        min: [0, 'finalPrice cannot be less than 0'],
    },
    paymentGetway: {
        type: String,
        default: '',
    },
    paymentMethod: {
        type: String,
    },
    paymentId: {
        type: String,
        default: '',
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
    },
    startDate: {
        type: Date,
        default: Date.now,
    },
    expiryDate: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['active', 'expired'],
        default: 'active',
    },
}, { timestamps: true });

AllCategorySubscriptionSchema.index({ userId: 1 });
AllCategorySubscriptionSchema.index({ paymentGetway: 1 });

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

AllCategorySubscriptionSchema.pre('save', function (next) {
    this.expiryDate = calculateExpiryDate(this.startDate, this.planType);
    next();
});

AllCategorySubscriptionSchema.methods.calculateFinalPrice = function () {
    // Calculate the total discount percentage from the plan and coupon
    const totalDiscountPercentage = this.discountFromPlan + this.discountFromCoupon;

    // Calculate the total discount amount based on the price and discount percentage
    const discountAmount = (this.price * totalDiscountPercentage) / 100;

    // Apply a flat 10% discount on top of the calculated discount
    const flatDiscountAmount = (this.price * this.flatDiscount) / 100;

    // Calculate the final price after all discounts
    this.finalPrice = this.price - discountAmount - flatDiscountAmount;
};

const AllCategorySubscriptionModel = mongoose.model('AllCategorySubscription', AllCategorySubscriptionSchema);

module.exports = AllCategorySubscriptionModel;
