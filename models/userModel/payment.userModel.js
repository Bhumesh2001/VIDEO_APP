const mongoose = require('mongoose');

const userPaymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'userId is required'],
    },
    plan: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: [true, 'Plan is required'],
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },
    paymentGetway: {
        type: String,
        required: [true, 'Payment getway is required'],
    },
    paymentId: {
        type: String,
        unique: true,
        required: [true, 'PaymentId is required'],
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

userPaymentSchema.index({ userId: 1, category: 1 });
userPaymentSchema.index({ paymentDate: 1 });
userPaymentSchema.index({ timestamps: 1 });

const userPaymentModel = mongoose.model('UserPayment', userPaymentSchema);

module.exports = userPaymentModel;
