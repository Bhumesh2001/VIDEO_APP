const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, // Use ObjectId for better data modeling
        ref: 'User',
    },
    title: {
        type: String,
        default: "",
        trim: true,
    },
    video: {
        type: {
            url: {
                type: String,
                default: "",
            },
            public_id: {
                type: String,
                default: "",
            },
        },
    },
    image: {
        type: {
            url: {
                type: String,
            },
            public_id: {
                type: String,
            },
        },
    },
    caption: {
        type: String,
        default: "",
        maxlength: [250, 'Caption cannot be longer than 250 characters.'], // Limit caption length
    },
    views: {
        type: Number,
        default: 0,
    },
    likes: {
        type: Number,
        default: 0,
    },
    duration: {
        type: Number,
        default: 30,
    },
    expirationTime: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiration
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'deleted'],
        default: 'active',
    },
}, { timestamps: true });

// Methods
storySchema.methods.isExpired = function () {
    return new Date() > this.expirationTime;
};

storySchema.methods.addView = function () {
    this.views += 1;
    return this.save();
};

storySchema.methods.addLike = function () {
    this.likes += 1;
    return this.save();
};

// Static method to update status of expired stories
storySchema.statics.updateExpiredStories = async function () {
    const expiredStories = await this.updateMany(
        { expirationTime: { $lt: Date.now() }, status: 'active' },
        { status: 'expired' }
    );
    return expiredStories;
};

// Indexes
storySchema.index({ title: 1 }, { unique: true }); // Ensure title is unique
storySchema.index({ status: 1 }); // Index by status for efficient queries (e.g., active stories)
storySchema.index({ expirationTime: 1 }); // Index by expirationTime for efficient expiration handling
storySchema.index({ createdAt: 1 }); // Index by created timestamp for efficient queries by creation date

const Story = mongoose.model('Story', storySchema);

module.exports = Story;
