const jwt = require('jsonwebtoken');

exports.generateTokenAndSetCookie = (user, res) => {
    const tokenPayload = { _id: user._id, role: user.role };

    // Include email or mobileNumber in the token payload
    if (user.email) tokenPayload.email = user.email;
    if (user.mobileNumber) tokenPayload.mobileNumber = user.mobileNumber;

    const token = jwt.sign(tokenPayload, process.env.USER_SECRET_KEY, { expiresIn: '7d' });

    // Set 7-day cookie with token
    res.cookie('userToken', token, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
        sameSite: 'Lax',
        path: '/',
    });

    return token;
};