const mongoose = require('mongoose');

const userPaymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    subscriptionType: {
        type: String,
        enum: ['one-time', 'subscription'],
        default: 'subscription'
    },
    plan: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: function () { return this.subscriptionType === 'subscription'; }
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    expiryDate: {
        type: Date,
        required: function () { return this.subscriptionType === 'subscription'; }
    },
}, { timestamps: true });

userPaymentSchema.pre('save', function (next) {
    if (this.subscriptionType === 'subscription' && !this.expiryDate) {
        let paymentDate = this.paymentDate || new Date();
        if (this.plan === 'monthly') {
            this.expiryDate = new Date(paymentDate.setMonth(paymentDate.getMonth() + 1)); // 1 month from paymentDate
        } else if (this.plan === 'quarterly') {
            this.expiryDate = new Date(paymentDate.setMonth(paymentDate.getMonth() + 3)); // 3 months from paymentDate
        } else if (this.plan === 'yearly') {
            this.expiryDate = new Date(paymentDate.setFullYear(paymentDate.getFullYear() + 1)); // 1 year from paymentDate
        }
    }
    next();
});

userPaymentSchema.index({ userId: 1, category: 1 });
userPaymentSchema.index({ timestamps: 1 });

const userPaymentModel = mongoose.model('UserPayment', userPaymentSchema);

module.exports = userPaymentModel;
