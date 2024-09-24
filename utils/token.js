const jwt = require('jsonwebtoken');

exports.generateTokenAndSetCookie = (user, res) => {
    const token = jwt.sign(
        { email: user.email, role: user.role, _id: user._id },
        process.env.USER_SECRET_KEY,
        { expiresIn: '2d' }
    );

    // Set secure cookie for token
    res.cookie('userToken', token, {
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 48,
        sameSite: 'Lax',
        path: '/',
    });
    return token;
};