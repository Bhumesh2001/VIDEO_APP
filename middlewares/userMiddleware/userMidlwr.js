const jwt = require('jsonwebtoken');
const Session = require('../../models/userModel/session.userModel');

exports.userAuthentication = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.userToken;
        if (!token) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: 'Authentication required'
            });
        };

        // Verify JWT token and extract userId
        const decoded = jwt.verify(token, process.env.USER_SECRET_KEY);
        const userId = decoded._id;

        // Check if the session exists for the user
        const session = await Session.findOne({ userId, token }).lean();
        if (!session) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: 'Session expired. Please log in again.'
            });
        };

        req.user = decoded;
        next();
    } catch (error) {
        next(error);
    };
};

