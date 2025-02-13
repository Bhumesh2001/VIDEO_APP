const mongoose = require('mongoose');

// Comment Schema
const commentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Index for userId in comments to speed up queries filtering by user
    },
    content: {
        type: String,
    },
}, { timestamps: true });

// Article Schema
const articleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true, // Index for userId to speed up searches by user
    },
    title: {
        type: String,
        index: { unique: true, sparse: true }, // Unique index on title
        trim: true
    },
    description: {
        type: String,
        trim: true,
    },
    image: {
        type: String,
    },
    public_id: {
        type: String,
    },
    likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
        index: true, // Index likes for faster lookup when checking if a user liked an article
    },
    comments: [commentSchema],
}, { timestamps: true });

// Remove duplicate or redundant indexes
articleSchema.index({ userId: 1, title: 1 });  // Efficient search by user and title

// Add an index for efficient searches based on article's creation time
articleSchema.index({ createdAt: -1 });  // This index already handles sorting based on createdAt

// Model
const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
