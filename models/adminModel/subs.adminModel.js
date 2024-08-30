const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        unique: true,
        minlength: [3, 'Name must be at least 3 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be less than 0'],
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 day'],
    },
    features: {
        type: [String],
        validate: {
            validator: function (v) {
                return v.length > 0;
            },
            message: 'At least one feature is required',
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

subscriptionSchema.index({ name: 1 }, { unique: true });
subscriptionSchema.index({ timestamps: 1 });

subscriptionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
