const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    title: {
        type: String,
        unique: true,
        required: [true, 'title is required'],
        minlength: [5, 'Title must be at least 5 characters long'],
        maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    video: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    caption: {
        type: String,
        trim: true,
        unique: true,
        maxlength: 300,
    },
    views: {
        type: Number,
        default: 0,
        min: 0,
    },
    likes: {
        type: Number,
        default: 0,
        min: 0,
    },
    duration: {
        type: Number,
        required: true,
        min: [1, 'Duration must be at least 1 second.']
    },
    expirationTime: {
        type: Date,
        required: true,
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000) // 24 hours from creation
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'deleted'],
        default: 'active',
    },
}, {
    timestamps: true
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

storySchema.index({ title: 1 }, { unique: true })
storySchema.index({ timestamps: 1 });

const Story = mongoose.model('Story', storySchema);

module.exports = Story;
