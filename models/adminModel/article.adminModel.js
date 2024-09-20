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
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true }
);

const articleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        unique: true,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [10, 'Title must be at least 10 characters long'],
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [50, 'Description must be at least 50 characters long'],
        maxlength: [5000, 'Description cannot exceed 5000 characters'],
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
    public_id: {
        type: String,
        required: true,
        unique: true,
    },
    likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    comments: [commentSchema],
}, { timestamps: true }
);

articleSchema.index({ title: 1 }, { unique: true });
articleSchema.index({ likes: 1 }, { sparse: true });
articleSchema.index({ 'comments.userId': 1 });
articleSchema.index({ timestamps: 1 });

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
