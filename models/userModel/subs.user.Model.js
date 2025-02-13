const mongoose = require('mongoose');
const { Schema } = mongoose;

const SingleCategorySubscriptionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
    },
    planType: {
        type: String,
    },
    price: {
        type: Number,
    },
    discount: {
        type: Number,
        default: 0
    },
    finalPrice: {
        type: Number
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

SingleCategorySubscriptionSchema.index({ userId: 1 });
SingleCategorySubscriptionSchema.index({ categoryId: 1 });

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
        case 'lifetime':
            return null;
        default:
            throw new Error('Invalid planType');
    };

    return expiryDate;
};

SingleCategorySubscriptionSchema.pre('save', function (next) {
    this.expiryDate = calculateExpiryDate(this.startDate, this.planType);
    next();
});

const SingleCategorySubscriptionModel = mongoose.model(
    'SingleCategorySubscription',
    SingleCategorySubscriptionSchema
);

module.exports = SingleCategorySubscriptionModel;