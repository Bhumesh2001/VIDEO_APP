const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    prices: {
        monthly: {
            type: Number,
            required: true,
            min: 0,
        },
        quarterly: {
            type: Number,
            required: true,
            min: 0,
        },
        yearly: {
            type: Number,
            required: true,
            min: 0,
        }
    },
    image: {
        type: String,
        validate: {
            validator: function (v) {
                return /^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(v);
            },
            message: props => `${props.value} is not a valid image URL!`
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
}, { timestamps: true });

categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ timestamps: 1 });

categorySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
