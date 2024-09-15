const jwt = require('jsonwebtoken');

exports.userAuthentication = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        let token;

        if (authHeader) {
            const tokenParts = authHeader.split(' ');

            if (tokenParts[0] === 'Bearer' && tokenParts[1]) {
                token = tokenParts[1];
            } else {
                return res.status(401).json({ message: 'Malformed authorization header.' });
            }
        };

        if (!token) {
            token = req.cookies.userToken;
        };

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized, please login.' });
        };

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
