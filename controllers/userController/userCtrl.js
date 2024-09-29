const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const userModel = require('../../models/userModel/userModel');
const { generateCode } = require('../../utils/resendOtp.userUtil');
const { generateTokenAndSetCookie } = require('../../utils/token');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.ClIENT_SECRET,
    process.env.CALLBACK_URL
);

const temporaryStorage = new Map();

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// --------------- Register User -----------------
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, mobileNumber } = req.body;

        // Validate strong password
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be strong (include upper, lower, number, and special character)',
            });
        }

        // Check for existing user
        const existingUser = await userModel.findOne({ email }).lean().lean().exec();
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create and store user data
        const verificationCode = generateCode();
        const userData = { name, email, password, mobileNumber, Code: verificationCode, isVerified: false };
        temporaryStorage.set(email, userData);

        const filePath = path.join(__dirname, '../../pages/mail.html');
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const personalizedHtml = htmlContent.replace('{{otp}}', verificationCode);

        // Send verification email
        transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: 'Account Verification',
            html: personalizedHtml,
        }, (err, info) => {
            if (err) console.error('Error sending email:', err);
            else console.log('Verification email sent:', info.response);
        });

        // Respond with success
        res.status(201).json({
            success: true,
            message: 'Please verify your email',
        });

        // Set timeout for temporary data expiration (15 minutes)
        setTimeout(() => {
            if (temporaryStorage.has(email)) {
                temporaryStorage.delete(email);
                console.log(`Temporary data for user "${email}" has expired and been removed.`);
            }
        }, 15 * 60 * 1000);  // 15 minutes

    } catch (error) {
        console.error('Error during user registration:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: Object.values(error.errors).map(err => err.message),
            });
        }

        // Handle duplicate errors (email already exists)
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(409).json({
                success: false,
                message: `Duplicate field value entered for ${field}: ${error.keyValue[field]}. Please use another value!`,
            });
        }

        // General server error
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

// ---------------- Register with email -----------------
exports.registerUserWithEmail = async (req, res) => {
    try {
        const { name, email, password, mobileNumber } = req.body;

        let user = await userModel.findOne({ email }).lean().lean().exec();

        if (user) {
            const token = generateTokenAndSetCookie(user, res);
            return res.status(200).json({
                success: true,
                message: 'User logged in successfully',
                userId: user._id,
                token,
            });
        };

        const verificationCode = generateCode();
        const userData = {
            name: name ? name : `User_${crypto.randomBytes(4).toString('hex')}`,
            email,
            password,
            mobileNumber: mobileNumber ? mobileNumber : `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            Code: verificationCode,
            isVerified: false
        };
        temporaryStorage.set(email, userData);

        const filePath = path.join(__dirname, '../../pages/mail.html');
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const personalizedHtml = htmlContent.replace('{{otp}}', verificationCode);

        transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: 'Account Verification',
            html: personalizedHtml,
        }, (err, info) => {
            if (err) console.error('Error sending email:', err);
            else console.log('Verification email sent:', info.response);
        });

        // Respond with success
        res.status(201).json({
            success: true,
            message: 'Please verify your email',
        });

        // Set timeout for temporary data expiration (15 minutes)
        setTimeout(() => {
            if (temporaryStorage.has(email)) {
                temporaryStorage.delete(email);
                console.log(`Temporary data for user "${email}" has expired and been removed.`);
            }
        }, 15 * 60 * 1000);  // 15 minutes

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// -------------- Verify User -------------------
exports.verifyUser = async (req, res) => {
    const { email, code } = req.body;

    try {
        // Check if temporary storage has user data
        const user_data = temporaryStorage.get(email);
        if (!user_data) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code!',
            });
        }

        const { Code, ...userDetails } = user_data;

        // Check if the verification code matches
        if (parseInt(code) !== Code) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect verification code.',
            });
        }

        // Create new user and save
        const user = new userModel({
            ...userDetails,
            isVerified: true,
        });
        await user.save();

        // Delete temporary user data after successful verification
        temporaryStorage.delete(email);

        // Generate JWT token
        const token = jwt.sign(
            { email: user.email, role: user.role, _id: user._id },
            process.env.USER_SECRET_KEY,
            { expiresIn: '2d' }
        );

        // Set secure cookie for token
        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 48,  // 2 days
            sameSite: 'Lax',
            path: '/',
        });

        // Respond with success
        res.status(200).json({
            success: true,
            message: 'Logged in successfully.',
            userId: user._id,
            token,
        });

    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred during user verification',
            error: error.message,
        });
    }
};

// -------------- Forget password -----------------
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await userModel.findOne({ email }).lean().exec();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found!' });
        };

        // Generate OTP and expiration (valid for 10 minutes)
        const otp = generateCode();
        user.otp = otp;
        user.otpExpiration = Date.now() + 10 * 60 * 1000; // 10 minutes from now
        await user.save();

        // Send OTP via email
        await transporter.sendMail({
            to: user.email,
            from: 'support@example.com',
            subject: 'Your OTP for Password Reset',
            html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`
        });

        res.status(200).json({ success: true, message: 'OTP sent to your email!' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error sending OTP' });
    };
};

// -------------- Reset password ------------------
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const user = await userModel.findOne({ email, otp, otpExpiration: { $gt: Date.now() } }).lean().exec();
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid OTP or OTP has expired!' });
        };

        user.password = newPassword;
        user.otp = undefined;
        user.otpExpiration = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successfully!' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    };
};

// -------------- Resend otp -------------------
exports.resendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await userModel.findOne({ email }).lean().exec();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found!'
            });
        };

        // Generate new OTP if the user has no OTP or if the current one has expired
        if (!user.otp || user.otpExpiration < Date.now()) {
            const newOTP = generateCode();
            user.otp = newOTP;
            user.otpExpiration = Date.now() + 10 * 60 * 1000; // New OTP expires in 10 minutes
            await user.save();

            // Send OTP via email
            await transporter.sendMail({
                to: user.email,
                from: process.env.EMAIL,
                subject: 'Your Resent OTP for Password Reset',
                html: `<p>Your new OTP is <strong>${newOTP}</strong>. It is valid for 10 minutes.</p>`
            });

            return res.status(200).json({
                success: true,
                message: 'New OTP has been sent to your email!',
            });
        } else {
            // If the current OTP is still valid, do not generate a new one
            return res.status(400).json({
                success: false,
                message: 'The current OTP is still valid. Please wait until it expires.'
            });
        };
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error occurred while resending OTP',
        });
    };
};

// -------------- Resend verification code --------------------
exports.resendVerificationCode = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await temporaryStorage.get(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        };

        // Check if the user is already verified
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User is already verified",
            });
        };

        // Generate a new verification code
        const verificationCode = generateCode();

        user.Code = verificationCode;
        temporaryStorage.delete(email);
        temporaryStorage.set(email, user);

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Account Verification',
            text: `Your verification code is: ${Code}`,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) return console.error(err);
            console.log('Verification email sent: ' + info.response);
        });

        return res.status(200).json({
            success: true,
            message: "Verification code resent successfully",
        });
    } catch (error) {
        console.error("Error resending verification code:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while resending verification code",
        });
    };
};

// -------------- Login User ---------------------
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email }).lean().exec();

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        };

        const token = jwt.sign(
            { email: user.email, role: user.role, _id: user._id },
            process.env.USER_SECRET_KEY,
            { expiresIn: '2d' },
        );

        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 48,
            sameSite: 'Lax',
            path: '/',
        });

        res.status(200).json({
            success: true,
            message: 'User logged in successful...!',
            userId: user._id,
            token,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured during login',
        });
    };
};

// ------------- Logout User -----------------
exports.logoutUser = async (req, res) => {
    try {
        const userToken = req.cookies?.userToken;

        // Check if userToken exists in cookies
        if (!userToken) {
            return res.status(400).json({
                success: false,
                message: 'User is already logged out!',
            });
        }

        // Clear the userToken cookie
        res.clearCookie('userToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            path: '/',
        });

        // Send success response
        return res.status(200).json({
            success: true,
            message: 'User logged out successfully.',
        });

    } catch (error) {
        console.error('Logout exception:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to log out due to a server error.',
            error: error.message,
        });
    }
};

// ---------------- login with google ----------------- 
exports.redirectToGoogleProfile = async (req, res) => {
    try {
        const googleUrl = client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
            ],
        });
        res.status(200).json({
            success: true,
            message: 'Past this url into the browser',
            googleUrl,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error during generate auth url',
        });
    };
};

exports.getGoogleProfile = async (req, res) => {
    const { code } = req.query;

    try {
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const userId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'];

        const token = jwt.sign(
            { email, role: 'user', _id: userId },
            process.env.USER_SECRET_KEY,
            { expiresIn: '2d' }
        );

        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 48,
            sameSite: 'Lax',
            path: '/',
        });

        res.status(200).json({
            success: true,
            message: 'User logged in successful...',
            userId,
            token,
        });
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).json({ success: false, message: 'Authentication failed' });
    };
};

// -------------------- login with facebook -------------------
exports.redirectToFacebookProfile = (req, res) => {
    try {
        const fbAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&scope=email`;

        res.status(200).json({
            success: true,
            message: 'Paste this url into the browser',
            fbAuthUrl,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while redirect to fecebook profile',
        });
    };
};

exports.getFacebookProfile = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    };

    try {
        const tokenResponse = await axios.get('https://graph.facebook.com/v12.0/oauth/access_token', {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                code,
            },
        });
        const accessToken = tokenResponse.data.access_token;
        const userResponse = await axios.get('https://graph.facebook.com/me', {
            params: {
                fields: 'id,name,email',
                access_token: accessToken,
            },
        });
        const { id, email } = userResponse.data;
        const token = jwt.sign(
            { email, role: 'user', _id: id },
            process.env.USER_SECRET_KEY,
            { expiresIn: '2d' }
        );

        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 48,
            sameSite: 'Lax',
            path: '/',
        });

        res.status(200).json({
            success: true,
            message: 'User logged in successful...',
            userId: id,
            token,
        });

    } catch (error) {
        console.error('Error during Facebook authentication:', error);
        res.status(500).json({ success: false, message: 'Authentication failed' });
    };
};

// -------------------- user profile ---------------------

exports.userProfile = async (req, res) => {
    try {
        const profile = await userModel.findById(req.user._id, {
            __v: 0, createdAt: 0, updatedAt: 0, isVerified: 0, role: 0, password: 0,
        });

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        res.status(200).json({ success: true, message: 'Profile fetched successfully.', profile });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Error occurred while fetching the user profile.' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId not found",
            });
        };

        const { profilePicture, ...userData } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found!',
            });
        };

        if (profilePicture) {
            const isValidURL = /^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(profilePicture);
            if (!isValidURL) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid profile picture URL!',
                });
            };
            await user.updateProfilePicture(profilePicture);
        };

        Object.assign(user, userData);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User updated successfully...',
            user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while updating the profile',
            error: error.message,
        });
    };
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : req.query.userId;
        if (!userId) {
            return res.status(404).json({
                success: true,
                message: "userId not found",
            });
        };
        const deleteUser = await userModel.findByIdAndDelete(userId);
        if (!deleteUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'User deleted successfully...',
            deleteUser,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while deleting the profile',
            error: error.message,
        });
    };
};