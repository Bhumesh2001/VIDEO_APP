const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }, // Reference to User
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "INR"
    },
    paymentMethod: {
        type: String,
        required: true
    }, // UPI, Razorpay, Stripe, etc.
    status: {
        type: String,
        enum: ["Pending", "Completed", "Failed"],
        default: "Pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Transaction", transactionSchema);
