// error handler
module.exports = (err, req, res, next) => {
    // Default error response structure
    const errorResponse = {
        success: false,
        message: err.message || 'Something went wrong, Please try again later!',
        status: err.status || 500,
        errors: err.errors || null,
    };

    // Handle specific error types
    if (err.name === 'ValidationError') {
        // If it's a validation error (e.g., from express-validator)
        errorResponse.message = 'Validation failed! Please check the input fields.';
        errorResponse.errors = err.errors; // Specific validation errors
        errorResponse.status = 400; // Bad Request
    } else if (err.name === 'JsonWebTokenError') {
        // If it's a JWT error (invalid or expired token)
        errorResponse.message = 'Your session has expired, Please log in again.';
        errorResponse.status = 401; // Unauthorized
    } else if (err.name === 'MongoError' || err.code === 11000) {
        // If it's a MongoDB duplicate key error (e.g., for unique fields)
        errorResponse.message = 'Data already exists.';
        errorResponse.status = 409; // Conflict
    } else if (err.name === 'CastError') {
        // If there's an invalid MongoDB ObjectId (e.g., wrong format)
        errorResponse.message = 'Invalid resource identifier.';
        errorResponse.status = 400; // Bad Request
    } else if (err.code === 'ENOENT') {
        // If file not found error
        errorResponse.message = 'File not found.';
        errorResponse.status = 404; // Not Found
    }

    // Send a structured error response
    res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message,
        errors: errorResponse.errors,
    });
};

