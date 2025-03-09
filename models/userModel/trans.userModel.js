const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        fileUrl: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true,
        }
    },
    { timestamps: true }
);

TransactionSchema.index({ userId: 1, subscriptionId: 1 }, { unique: true });

module.exports = mongoose.model("Transaction", TransactionSchema);
