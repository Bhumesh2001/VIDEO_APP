const mongoose = require('mongoose');
const { Schema } = mongoose;

const AllCategorySubscriptionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    planName: {
        type: String,
        required: [true, 'Plan is required'],
    },
    planType: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: [true, 'Plan type is required'],
    },
    totalPrice: {
        type: Number,
        required: [true, 'Total price is required'],
    },
    discountedPrice: {
        type: Number,
        required: [true, 'Discounted price is required'],
        min: [0, 'Discounted price cannot be less than 0'],
    },
    startDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

AllCategorySubscriptionSchema.index({ userId: 1 });

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

const AllCategorySubscriptionModel = mongoose.model('AllCategorySubscription', AllCategorySubscriptionSchema);

module.exports = AllCategorySubscriptionModel;
