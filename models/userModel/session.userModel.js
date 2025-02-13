const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    deviceId: {
        type: String, // Unique device ID (e.g., user-agent hash, or generated device ID)
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '2d', // Session expiry time (2d)
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
});

sessionSchema.index({ userId: 1 });
sessionSchema.index({ userId: 1, token: 1 });
sessionSchema.index({ deviceId: 1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;

