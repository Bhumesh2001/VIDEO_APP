const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'userId is required'],
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        unique: true,
        trim: true,
        minlength: [10, 'Title must be at least 10 characters long'],
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    authorName: {
        type: String,
        required: [true, 'Author name is required'],
        trim: true,
        minlength: [5, 'Author name must be at least 5 characters long'],
        maxlength: [100, 'Author name cannot exceed 100 characters'],
    },
    publicationDate: {
        type: Date,
        default: Date.now,
        required: [true, 'Publication date is required'],
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
        minlength: [50, 'Content must be at least 50 characters long'],
        maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    genre: {
        type: String,
        required: [true, 'Genre is required'],
        trim: true,
        minlength: [3, 'Genre must be at least 3 characters long'],
        maxlength: [50, 'Genre cannot exceed 50 characters'],
    },
    characters: {
        type: [String],
        default: [],
    },
    image: {
        type: String,
        validate: {
            validator: function (v) {
                return /\.(jpg|jpeg|png|gif)$/i.test(v);
            },
            message: 'Image URL must be a valid format (jpg, jpeg, png, gif)',
        },
        required: [true, 'Image is required'],
    },
    latest: {
        type: Boolean,
        default: false,
    },
},{ timestamps: true });

storySchema.index({ userId: 1 });
storySchema.index({ title: 1 }, { unique: true });
storySchema.index({ authorName: 1 });
storySchema.index({ genre: 1 });
storySchema.index({ timestamps: 1 });

const Story = mongoose.model('Story', storySchema);

module.exports = Story;
