const jwt = require('jsonwebtoken');

exports.adminAuthentication = async (req, res, next) => {
    try {
        // Extract token from Authorization header or cookies
        const token = req.headers['authorization']?.split(' ')[1] || req.cookies?.adminToken;

        // Verify token
        const decoded = jwt.verify(token, process.env.ADMIN_SECRET_KEY);

        // Check if the user is an admin
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                status: 403,
                message: 'Access denied.'
            });
        };

        req.admin = decoded;
        next();
    } catch (error) {        
        next(error);
    };
};
