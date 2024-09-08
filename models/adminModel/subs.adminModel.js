const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
    planName: {
        type: String,
        required: [true, 'Plan name is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Plan name must be at least 3 characters long'],
    },
    planType: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: [true, 'Plan type is required'],
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be less than 0'],
        validate: {
            validator: function (v) {
                return v % 1 === 0;
            },
            message: 'Price must be a whole number',
        },
    },
    features: {
        type: [String],
        required: [true, 'At least one feature is required'],
        validate: {
            validator: function (v) {
                return v.length > 0 && v.every(feature => feature.trim() !== '');
            },
            message: 'Each feature must be a valid non-empty string',
        },
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
}, { timestamps: true });

SubscriptionPlanSchema.index({ planName: 1 }, { unique: true });
SubscriptionPlanSchema.index({ planType: 1 });
SubscriptionPlanSchema.index({ timestamps: 1 });

SubscriptionPlanSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

module.exports = SubscriptionPlan;
