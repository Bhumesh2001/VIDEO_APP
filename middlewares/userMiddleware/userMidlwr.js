const jwt = require('jsonwebtoken');

exports.userAuthentication = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: 'Unauthorized, please login.' });
        };

        const tokenParts = authHeader.split(' ');
        if (tokenParts[0] !== 'Bearer' || !tokenParts[1]) {
            return res.status(401).json({ message: 'Malformed authorization header.' });
        };

        const token = tokenParts[1];
        const decoded = jwt.verify(token, process.env.USER_SECRET_KEY);

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired, please login again.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token is not valid.' });
        } else {
            console.error(error);
            return res.status(500).json({ message: 'Internal server error.' });
        };
    };
};
