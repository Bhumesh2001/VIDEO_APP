const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        unique: true,
        minlength: [5, 'Title must be at least 5 characters long'],
        maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [20, 'Description must be at least 20 characters long'],
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    imageUrl: {
        type: String,
        required: [true, 'Image URL is required'],
        unique: true,
        validate: {
            validator: function (v) {
                return /\.(jpg|jpeg|png|gif)$/i.test(v);
            },
            message: 'Image URL must be a valid format (jpg, jpeg, png, gif)',
        },
    },
    active: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true }
);

bannerSchema.index({ title: 1 });
bannerSchema.index({ timestamps: 1 });


const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
