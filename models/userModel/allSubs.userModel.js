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
    planType: {
        type: String,
        required: [true, "PlanType is required!"],
    },
    price: {
        type: Number,
        require: [true, 'price is required!'],
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
            message: 'Discount must be a whole number',
        },
    },
    finalPrice: {
        type: Number,
        required: [true, 'finalPrice is required'],
        min: [0, 'finalPrice cannot be less than 0'],
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
        case 'lifetime':
            return null;
        default:
            throw new Error('Invalid planType');
    };
    
    return expiryDate;
};

AllCategorySubscriptionSchema.pre('save', function (next) {
    this.expiryDate = calculateExpiryDate(this.startDate, this.planType);
    next();
});

const AllCategorySubscriptionModel = mongoose.model('AllCategorySubscription', AllCategorySubscriptionSchema);

module.exports = AllCategorySubscriptionModel;
