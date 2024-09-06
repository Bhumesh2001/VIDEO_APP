const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSubscriptionSchema = new Schema({
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
    plan: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: [true, 'Plan is required'],
    },
    totalPrice: {
        type: Number,
        require: [true, 'toatalPrice is required!'],
    },
    discountedPrice: {
        type: Number,
        required: [true, 'discountedPrice is required'],
        min: [0, 'discountedPrice cannot be less than 0'],
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
}, { timestamps: true });

function calculateExpiryDate(startDate, plan) {
    const expiryDate = new Date(startDate);
    switch (plan) {
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
            throw new Error('Invalid plan');
    };
    return expiryDate;
};

UserSubscriptionSchema.pre('save', function (next) {
    this.expiryDate = calculateExpiryDate(this.startDate, this.plan);
    next();
});

UserSubscriptionSchema.virtual('isActive').get(function () {
    return new Date() < this.expiryDate;
});

UserSubscriptionSchema.index({ userId: 1 });
UserSubscriptionSchema.index({ categoryId: 1 });

const UserSubscriptionModel = mongoose.model('Subscription', UserSubscriptionSchema);

module.exports = UserSubscriptionModel;