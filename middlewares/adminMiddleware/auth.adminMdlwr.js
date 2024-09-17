const jwt = require('jsonwebtoken');

exports.adminAuthentication = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        let token;

        if (authHeader) {
            const tokenParts = authHeader.split(' ');
            
            if (tokenParts[0] === 'Bearer' && tokenParts[1]) {
                token = tokenParts[1];
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Malformed authorization header.'
                });
            };
        };

        if (!token) {
            token = req.cookies.adminToken;
        };
        
        if (!token) {
            return res.redirect('/login');
        };

        const decoded = jwt.verify(token, process.env.ADMIN_SECRET_KEY);

        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admins only.'
            });
        };

        req.admin = decoded;
        next();
    } catch (error) {
        console.error(error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired, please log in again.'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid token.'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Internal server error.'
            });
        };
    };
};
