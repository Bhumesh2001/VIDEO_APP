const jwt = require('jsonwebtoken');

exports.userAuthentication = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.userToken;

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized, please login.' });
        }

        req.user = jwt.verify(token, process.env.USER_SECRET_KEY);
        next();
    } catch (error) {
        const errorMessage = error.name === 'TokenExpiredError'
            ? 'Token has expired, please login again.'
            : error.name === 'JsonWebTokenError'
                ? 'Token is not valid.'
                : 'Internal server error.';

        return res.status(error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' ? 401 : 500).json({ message: errorMessage });
    }
};

