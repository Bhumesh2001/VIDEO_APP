const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Ensures unique names
        trim: true,
    },
    public_id: {
        type: String,
        required: true,
    },
    image_url: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],  // Only allows 'active' or 'inactive' status
        default: 'active', // Defaults to 'active'
    }
}, { timestamps: true });

// Indexes
categorySchema.index({ name: 1 });    // Index for fast search on 'name'
categorySchema.index({ status: 1 });  // Index for filtering 'status' (active/inactive)

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
