const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
    plan: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: [true, 'Plan is required'],
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be less than 0'],
    },
    features: {
        type: [String],
        validate: {
            validator: function (v) {
                return v.length > 0;
            },
            message: 'At least one feature is required',
        },
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
}, { timestamps: true });

SubscriptionPlanSchema.index({ plan: 1 });
SubscriptionPlanSchema.index({ timestamps: 1 });

SubscriptionPlanSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

module.exports = SubscriptionPlan;
