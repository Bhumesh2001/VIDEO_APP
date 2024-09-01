const jwt = require('jsonwebtoken');

exports.adminAuth = async (req, res, next) => {
    const token = req.cookies.adminToken;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized. Please log in.',
        });
    };
    try {
        const decoded = jwt.verify(token, process.env.ADMIN_SECRET_KEY);
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admins only.',
            });
        };
        req.admin = decoded;
        next();
    } catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            message: 'Invalid token.'
        });
    };
};