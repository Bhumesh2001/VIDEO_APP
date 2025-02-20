const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
    planName: {
        type: String,
        trim: true,
    },
    planType: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
    },
    price: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        default: 0,
    },
    finalPrice: {
        type: Number,
        required: true,
        default: function () {
            return this.price - (this.price * (this.discount / 100));
        },
    },
    features: {
        type: [String],
        required: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
    },
    isAllCategory: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Ensure no duplicate features and trim each feature string
SubscriptionPlanSchema.pre('save', function (next) {
    this.features = [...new Set(this.features.map(feature => feature.trim()))]; // Remove duplicates and trim spaces
    this.finalPrice = this.price - (this.price * (this.discount / 100)); // Recalculate final price if needed
    next();
});

// Indexes for performance improvement
SubscriptionPlanSchema.index({ planName: 1 }, { unique: true });
SubscriptionPlanSchema.index({ planType: 1 });
SubscriptionPlanSchema.index({ status: 1 });
SubscriptionPlanSchema.index({ createdAt: 1 }); // Optional: if you query based on creation date

// Adding static method to get active plans
SubscriptionPlanSchema.statics.getActivePlans = async function () {
    return await this.find({ status: 'active' });
};

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

module.exports = SubscriptionPlan;
