const jwt = require('jsonwebtoken');

exports.userAuthentication = async (req, res, next) => {
    try {
        const token = req.cookies.userToken;
        if (!token) {
            return res.status(401).json({ message: 'Unautorized, Please login...' });
        };
        const decoded = jwt.verify(token, process.env.USER_SECRET_KEY);

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired, please login again.' });
        };
        return res.status(401).json({ message: 'Token is not valid' });
    };
};