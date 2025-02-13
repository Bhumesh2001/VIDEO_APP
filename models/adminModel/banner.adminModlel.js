const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    public_id: {
        type: String,
    },
    image: {
        type: String,
    },
    status: {
        type: String,
        default: 'Active',
    },
}, { timestamps: true });

bannerSchema.index({ status: 1 });  // Index on status for filtering active banners
bannerSchema.index({ createdAt: -1 });  // Index for efficient sorting by creation date (newest first)

// Model
const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
