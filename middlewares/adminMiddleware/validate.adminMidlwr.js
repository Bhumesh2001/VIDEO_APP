const mongoose = require('mongoose');

exports.validateObjectIds = (keys) => (req, res, next) => {
    const errors = [];

    keys.forEach((key) => {
        const value = req.query[key] || req.params[key] || req.body[key];

        if (!value) {
            errors.push(`${key} is required`);
        } else if (!mongoose.Types.ObjectId.isValid(value)) {
            errors.push(`${key} has an invalid ID format`);
        };
    });

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: errors.join(', '),
        });
    };

    next();
};

exports.validateRequiredFields = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `The following fields are required: ${missingFields.join(', ')}`,
            });
        };
        
        next();
    };
};
