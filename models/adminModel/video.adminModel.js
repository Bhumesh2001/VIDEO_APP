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
    }
});

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        unique: true,
        required: [true, 'Title is required'],
        minlength: [5, 'Title must be at least 5 characters long'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [10, 'Description must be at least 10 characters long'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required']
    },
    thumbnail: {
        type: {
            publicId: {
                type: String
            },
            url: {
                type: String,
                validate: {
                    validator: function (v) {
                        return /^https?:\/\/.+/.test(v);
                    },
                    message: props => `${props.value} is not a valid URL for a thumbnail image!`
                }
            }
        }
    },
    video: {
        type: {
            publicId: {
                type: String
            },
            url: {
                type: String,
                validate: {
                    validator: function (v) {
                        return /^(ftp|http|https):\/\/[^ "]+$/.test(v);
                    },
                    message: props => `${props.value} is not a valid URL!`
                }
            }
        }
    },
    likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    comments: [commentSchema],
}, {
    timestamps: true,
});

videoSchema.index({ title: 1 }, { unique: true });
videoSchema.index({ category: 1 });

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;