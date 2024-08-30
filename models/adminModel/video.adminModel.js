const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        minlength: [1, 'Comment must be at least 1 character long'],
        maxlength: [500, 'Comment cannot exceed 500 characters']
    },
}, { timestamps: true }
);

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        unique: true,
        required: [true, 'Title is required'],
        minlength: [5, 'Title must be at least 5 characters long'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [10, 'Description must be at least 10 characters long']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
    },
    thumbnail: {
        type: {
            publicId: {
                type: String,
                unique: true,
                required: [true, 'Public ID is required'],
            },
            url: {
                type: String,
                required: true,
                trim: true,
                validate: {
                    validator: function (v) {
                        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/.test(v);
                    },
                    message: props => `${props.value} is not a valid URL for a thumbnail image!`
                }
            }
        },
        unique: true,
        required: [true, "Thumbnail is required!"],
    },
    video: {
        type: {
            publicId: {
                type: String,
                unique: true,
                required: [true, 'Public ID is required'],
            },
            url: {
                type: String,
                unique: true,
                required: [true, 'Video URL is required'],
                validate: {
                    validator: function (v) {
                        return /^(ftp|http|https):\/\/[^ "]+$/.test(v);
                    },
                    message: props => `${props.value} is not a valid URL!`
                }
            }
        },
        unique: true,
        required: [true, "Video is required!"],
    },
    likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    comments: [commentSchema],
    shares: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

videoSchema.index({ title: 1 }, { unique: true });
videoSchema.index({ category: 1 });
videoSchema.index({ 'comments.userId': 1 });
videoSchema.index({ timestamps: 1 });

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
