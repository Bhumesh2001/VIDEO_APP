const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
    },
}, { timestamps: true });

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [150, 'Video title cannot exceed 150 characters.'],
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: [5000, 'Video description cannot exceed 5000 characters.'],
    },
    category: {
        type: String,
        required: true,
        trim: true,
        lowercase: true, // Normalize for consistency
    },
    thumbnail: {
        type: {
            publicId: { type: String, required: true },
            url: { type: String, required: true },
        },
        required: true,
    },
    video: {
        type: {
            publicId: { type: String, required: true },
            url: { type: String, required: true },
        },
        required: true,
    },
    likes: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: [],
    },
    comments: [commentSchema],
}, { timestamps: true });

// Optimized indexes
videoSchema.index({ category: 1 }); // For filtering by category
videoSchema.index({ createdAt: -1 }); // For sorting by recency

// Helper methods
videoSchema.methods.addLike = async function (userId) {
    if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        return await this.save();
    }
};

videoSchema.methods.removeLike = async function (userId) {
    const index = this.likes.indexOf(userId);
    if (index > -1) {
        this.likes.splice(index, 1);
        return await this.save();
    }
};

videoSchema.methods.addComment = async function (userId, content) {
    const comment = { userId, content };
    this.comments.push(comment);
    return await this.save();
};

videoSchema.methods.removeComment = async function (commentId) {
    const index = this.comments.findIndex(comment => comment._id.toString() === commentId);
    if (index > -1) {
        this.comments.splice(index, 1);
        return await this.save();
    }
};

videoSchema.statics.getByCategoryAndTitle = async function (category, title) {
    return this.find({ category, title: new RegExp(title, 'i') });
};

videoSchema.methods.getLikesAndCommentsCount = async function () {
    return { likesCount: this.likes.length, commentsCount: this.comments.length };
};

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;