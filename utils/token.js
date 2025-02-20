const jwt = require('jsonwebtoken');
const Session = require('../models/userModel/session.userModel');

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

// Helper function for creating JWT token
exports.generateToken = (user) => {
    return jwt.sign(
        { email: user.email, role: user.role, _id: user._id },
        process.env.USER_SECRET_KEY,
        { expiresIn: '2d' }
    );
};

// Helper function for session management
exports.createSession = async (user, token, deviceId) => {
    const session = new Session({ userId: user._id, token, deviceId });
    await session.save();
};

exports.checkSession = async (userId) => {
    const userSession = await Session.findOne({ userId }).lean();
    if (!userSession) return false;
    return true;
};
