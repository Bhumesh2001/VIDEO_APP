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

SingleCategorySubscriptionSchema.virtual('isActive').get(function () {
    return new Date() < this.expiryDate;
});

SingleCategorySubscriptionSchema.index({ userId: 1 });
SingleCategorySubscriptionSchema.index({ categoryId: 1 });

const SingleCategorySubscriptionModel = mongoose.model('SingleCategorySubscription', SingleCategorySubscriptionSchema);

module.exports = SingleCategorySubscriptionModel;