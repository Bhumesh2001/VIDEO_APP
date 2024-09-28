const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
    },
    video: {
        type: {
            url: {
                type: String,
                default: "",
                validator: function (v) {
                    if (!v) return false;
                    return /^(https?|ftp):\/\/[^\s$.?#].[^\s]*$/i.test(v);
                },
                message: props => `"${props.value || 'URL'}" is not a valid URL!`
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
                required: [true, 'Image URL is required'],
                validate: {
                    validator: function (v) {
                        return /^(https?|ftp):\/\/[^\s$.?#].[^\s]*$/i.test(v);
                    },
                    message: props => `"${props.value}" is not a valid URL for a thumbnail image!`,
                },
            },
            public_id: {
                type: String,
                required: [true, 'Image public_id is required'],
            },
        },
        required: true,
    },
    caption: {
        type: String,
        default: "",
    },
    views: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    duration: {
        type: Number,
        min: [1, 'Duration must be at least 1 second'],
        max: [30, 'Duration cannot exceed 30 seconds'],
        default: 30,
    },
    expirationTime: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'deleted'],
        default: 'active',
    },
}, {
    timestamps: true,
});

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

storySchema.index({ title: 1 }, { unique: true });
storySchema.index({ timestamps: 1 });
storySchema.index({ expirationTime: 1 });

const Story = mongoose.model('Story', storySchema);

module.exports = Story;
