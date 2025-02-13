const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
        minlength: [1, 'Comment content cannot be empty.'],
        maxlength: [500, 'Comment content cannot exceed 500 characters.'],
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
    },
    thumbnail: {
        type: {
            publicId: {
                type: String,
            },
            url: {
                type: String,
            },
        },
        required: true,
    },
    video: {
        type: {
            publicId: {
                type: String,
            },
            url: {
                type: String,
            },
        },
        required: true,
    },
    likes: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        default: [],
    },
    comments: [commentSchema],
}, {
    timestamps: true,
});

// Indexing for better performance
videoSchema.index({ title: 1, category: 1 }); // Index for title and category for searching
videoSchema.index({ category: 1 }); // Category index for filtering videos by category
videoSchema.index({ createdAt: -1 }); // Index for sorting by latest videos
videoSchema.index({ updatedAt: -1 }); // Index for sorting by most recently updated videos
videoSchema.index({ likes: 1 }); // Index for faster queries on likes (for sorting by popularity or checking likes)
videoSchema.index({ comments: 1 }); // Index for faster queries on comments (if needed)
videoSchema.index({ description: 'text' }); // Full-text index for searching descriptions (if needed)

// Helper method for adding a like
videoSchema.methods.addLike = async function (userId) {
    if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        await this.save();
    }
};

// Helper method for removing a like
videoSchema.methods.removeLike = async function (userId) {
    const index = this.likes.indexOf(userId);
    if (index > -1) {
        this.likes.splice(index, 1);
        await this.save();
    }
};

// Helper method to add a comment
videoSchema.methods.addComment = async function (userId, content) {
    const comment = {
        userId,
        content,
    };
    this.comments.push(comment);
    await this.save();
};

// Helper method to delete a comment
videoSchema.methods.removeComment = async function (commentId) {
    const index = this.comments.findIndex(comment => comment._id.toString() === commentId);
    if (index > -1) {
        this.comments.splice(index, 1);
        await this.save();
    }
};

// Static method to get videos by category and title (example use case)
videoSchema.statics.getByCategoryAndTitle = async function (category, title) {
    return this.find({ category, title: new RegExp(title, 'i') }); // Case-insensitive search
};

// Aggregation pipeline to get the total number of likes/comments for a video (optional)
videoSchema.methods.getLikesAndCommentsCount = async function () {
    const likesCount = this.likes.length;
    const commentsCount = this.comments.length;
    return { likesCount, commentsCount };
};

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
