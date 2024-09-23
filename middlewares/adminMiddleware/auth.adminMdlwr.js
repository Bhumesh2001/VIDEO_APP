const jwt = require('jsonwebtoken');

exports.adminAuthentication = async (req, res, next) => {
    try {
        // Extract token from Authorization header or cookies
        const token = req.headers['authorization']?.split(' ')[1] || req.cookies?.adminToken;

        // Redirect to login if no token is found
        if (!token) return res.redirect('/login');

        // Verify token
        const decoded = jwt.verify(token, process.env.ADMIN_SECRET_KEY);

        // Check if the user is an admin
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admins only.'
            });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        console.error('Authentication Error:', error);
        const message = error.name === 'TokenExpiredError' ? 'Token has expired, please log in again.'
            : error.name === 'JsonWebTokenError' ? 'Invalid token.'
                : 'Internal server error.';

        return res.status(error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' ? 401 : 500).json({
            success: false,
            message
        });
    }
};
