const axios = require('axios');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const {
    generateRandomEmail,
    generateRandomMobileNumber,
    sendVerificationEmail,
    sendOtpEmail
} = require('../../services/emailService');
const userModel = require('../../models/userModel/userModel');
const Session = require('../../models/userModel/session.userModel');
const { generateCode } = require('../../utils/resendOtp.userUtil');
const {
    generateToken,
    createSession,
    checkSession
} = require('../../utils/token');
const {
    isValidPassword,
    isValidImageUrl,
    isValidEmail,
    isValidMobileNumber
} = require('../../utils/validateUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.CLIENT_ID, process.env.ClIENT_SECRET, process.env.CALLBACK_URL);
const temporaryStorage = new Map();

// --------------- Register User -----------------
exports.registerUser = async (req, res, next) => {
    try {
        const { name, email, username, password, mobileNumber } = req.body;

        // Validate strong password
        if (password) {
            if (!isValidPassword(password)) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Password must be strong!',
                });
            };
        };

        // Check for existing user
        const existingUser = await userModel.findOne({ email }).lean();
        if (existingUser) {
            return res.status(400).json({ success: false, status: 400, message: 'User already exists' });
        }

        // Create and store user data
        const verificationCode = generateCode();
        const userData = {
            name: name ? name : `User_${crypto.randomBytes(4).toString('hex')}`,
            email,
            password,
            username: username ? username : `User_${crypto.randomBytes(2).toString('hex')}`,
            mobileNumber,
            Code: verificationCode,
            isVerified: false
        };
        temporaryStorage.delete(email);
        temporaryStorage.set(email, userData);

        const data = {
            verificationCode,
            subject: '🔐 Verify Your Account & Unlock Exclusive Features!',
        };
        sendVerificationEmail(email, data);

        // Respond with success
        res.status(201).json({
            success: true,
            status: 201,
            message: 'Please verify your email',
        });

        // Set timeout for temporary data expiration (10 minutes)
        setTimeout(() => {
            temporaryStorage.delete(email);
        }, 10 * 60 * 1000);  // 10 minutes

    } catch (error) {
        next(error);
    };
};

// ---------------- Register with email -----------------
exports.registerUserWithEmailOrPhone = async (req, res, next) => {
    try {
        const { name, email, username, password, mobileNumber } = req.body;

        // Validate either email or mobileNumber is provided
        if (!email && !mobileNumber) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Either email or mobile number is required'
            });
        };

        // Validate email and mobile number formats
        if (email && !isValidEmail(email)) {
            return res.status(400).json({ success: false, status: 400, message: 'Invalid email format.' });
        };

        if (mobileNumber && !isValidMobileNumber(mobileNumber)) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Invalid mobile number. It must be a 10-digit number.'
            });
        };

        // Check if user already exists by email or mobile number
        let user = await userModel.findOne({ $or: [{ email }, { mobileNumber }] }).lean();
        if (user) {
            if (await checkSession(user._id)) {
                return res.status(409).json({
                    success: false,
                    status: 409,
                    message: "Sorry! User is already logged in on another device.",
                });
            };

            const token = generateToken(user);
            const deviceId = crypto.createHash("sha256")
                .update(req.ip + req.headers["user-agent"])
                .digest("hex");
            await createSession(user, token, deviceId); // Create a session for the user

            res.cookie('userToken', token, {
                httpOnly: true,
                secure: true,
                maxAge: 1000 * 60 * 60 * 48, // 2 days
                sameSite: 'Strict',
            });

            // Clear node-cache
            clearCache("node-cache");

            return res.status(200).json({
                success: true,
                status: 200,
                message: 'Logged in successfully...!',
                userId: user._id,
                token
            });
        };

        // If user doesn't exist, create new user
        const newUser = new userModel({
            name: name || `User_${crypto.randomBytes(4).toString('hex')}`,
            email: email || generateRandomEmail(),
            password,
            username: username || `${(name || 'User').split(' ')
                .join('_')}_${crypto.randomBytes(2).toString('hex')}`,
            mobileNumber: mobileNumber || generateRandomMobileNumber(),
            isVerified: true
        });
        await newUser.save();

        const token = generateToken(newUser);
        const deviceId = crypto.createHash("sha256")
            .update(req.ip + req.headers["user-agent"])
            .digest("hex");
        await createSession(newUser, token, deviceId); // Create a session for the new user

        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 48, // 2 days
            sameSite: 'Strict',
        });

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Logged in successfully...!',
            userId: newUser._id,
            token
        });
    } catch (error) {
        next(error);
    };
};

// -------------- Verify User -------------------
exports.verifyUser = async (req, res, next) => {
    const { email, code } = req.body;

    try {
        // Check if temporary storage has user data
        const user_data = temporaryStorage.get(email);
        if (!user_data) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Invalid or expired verification code!',
            });
        }

        const { Code, ...userDetails } = user_data;
        if (parseInt(code) !== Code) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Incorrect verification code.',
            });
        }

        // Create new user and save
        const user = new userModel({ ...userDetails, isVerified: true });
        await user.save();

        // Delete temporary user data after successful verification
        temporaryStorage.delete(email);

        // const token = generateToken(user);
        // const deviceId = crypto.createHash("sha256")
        //     .update(req.ip + req.headers["user-agent"])
        //     .digest("hex"); // or generate a custom unique device ID
        // await createSession(user, token, deviceId); // Create a session for the user

        // res.cookie('userToken', token, {
        //     httpOnly: true,
        //     secure: true,
        //     maxAge: 1000 * 60 * 60 * 48, // 2 days
        //     sameSite: 'Strict',
        // });

        // Clear node-cache
        clearCache("node-cache");

        // Respond with success
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Logged in successfully.',
            userId: user._id,
            token,
        });
    } catch (error) {
        next(error);
    };
};

// -------------- Forget password -----------------
exports.forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, status: 404, message: 'User not found!' });
        };

        // Generate OTP and expiration (valid for 10 minutes)
        const otp = generateCode();
        user.otp = otp;
        user.otpExpiration = Date.now() + 10 * 60 * 1000; // 10 minutes from now
        await user.save();

        const data = {
            subject: '🔐 Your OTP for Password Reset',
            otp,
        };
        sendOtpEmail(email, data);

        res.status(200).json({ success: true, status: 200, message: 'OTP sent to your email!' });
    } catch (error) {
        next(error);
    };
};

// -------------- Reset password ------------------
exports.resetPassword = async (req, res, next) => {
    const { email, newPassword } = req.body;

    try {
        const user = await userModel.findOne({
            email,
            otp: { $ne: null },
            otpExpiration: { $ne: null }
        });

        if (!user) {
            return res.status(400).json({ success: false, status: 400, message: 'User not found!' });
        };

        user.password = newPassword;
        user.otp = null;
        user.otpExpiration = null;
        await user.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Password reset successfully!',
            user
        });
    } catch (error) {
        next(error);
    };
};

// --------------- Verify Otp ------------------- 
exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({
            success: false,
            status: 400,
            message: 'Email and OTP are required!'
        });

        const user = await userModel.findOne({ email, otp }).lean();
        if (!user) return res.status(404).json({
            success: false,
            status: 404,
            message: 'User not found!'
        });

        if (user.otp !== otp || user.otpExpiration <= Date.now()) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Invalid or expired OTP!'
            });
        };

        res.status(200).json({
            success: true,
            status: 200,
            message: 'OTP verified successfully!'
        });
    } catch (error) {
        next(error);
    };
};

// -------------- Resend otp -------------------
exports.resendOtp = async (req, res, next) => {
    const { email } = req.body;

    try {
        const user = await userModel.findOne({ email });
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

            const data = {
                subject: '🔐 Your OTP for Password Reset',
                otp: newOTP,
            };
            sendOtpEmail(email, data);

            return res.status(200).json({
                success: true,
                status: 200,
                message: 'New OTP has been sent to your email!',
            });
        } else {
            // If the current OTP is still valid, do not generate a new one
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'The current OTP is still valid. Please wait until it expires.'
            });
        };
    } catch (error) {
        next(error);
    };
};

// -------------- Resend verification code --------------------
exports.resendVerificationCode = async (req, res, next) => {
    const { email } = req.body;
    try {
        const user = await temporaryStorage.get(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "User not found",
            });
        };

        // Check if the user is already verified
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: "Already verified",
            });
        };

        // Generate a new verification code
        const verificationCode = generateCode();

        temporaryStorage.delete(email);
        user.Code = verificationCode;
        temporaryStorage.set(email, user);

        const data = {
            verificationCode,
            subject: '🔐 Verify Your Account & Unlock Exclusive Features!'
        };
        sendVerificationEmail(email, data);

        return res.status(200).json({
            success: true,
            status: 200,
            message: "Verification code resent successfully!",
        });
    } catch (error) {
        next(error);
    };
};

// -------------- Login User ---------------------
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 🔹 Find user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: "Invalid email or password",
            });
        }

        // 🔹 Validate password securely
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: "Invalid email or password",
            });
        }

        if (await checkSession(user._id)) {
            return res.status(409).json({
                success: false,
                status: 409,
                message: "Sorry! User is already logged in on another device.",
            });
        }

        // 🔹 Generate JWT Token
        const token = generateToken(user);
        const deviceId = crypto.createHash("sha256")
            .update(req.ip + req.headers["user-agent"])
            .digest("hex");
        await createSession(user, token, deviceId); // Create session for user

        // 🔹 Set token in secure HTTP-only cookie
        res.cookie("userToken", token, {
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 48, // 2 days
            sameSite: "Strict",
        });

        res.status(200).json({
            success: true,
            message: "Logged in successfully!",
            userId: user._id,
            token,
        });
    } catch (error) {
        next(error);
    }
};

// -------------- Chek Mobile Number --------------
exports.checkMobileNumber = async (req, res, next) => {
    try {
        const { mobileNumber } = req.body;

        // Check if the mobile number already exists in the database
        const userExists = await userModel.exists({ mobileNumber });

        clearCache('node-cache');

        return res.status(200).json({
            success: true,
            status: 200,
            message: userExists
                ? 'Mobile number already registered.'
                : 'Mobile number not registered.',
            exists: !!userExists,
        });

    } catch (error) {
        next(error);
    };
};

// ------------- Logout User -----------------
exports.logoutUser = async (req, res, next) => {
    try {
        const userToken = req.headers.authorization?.split(' ')[1] || req.cookies?.userToken;
        if (!userToken) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Already logged out!',
            });
        };

        const decoded = jwt.verify(userToken, process.env.USER_SECRET_KEY);
        await Session.deleteMany({ userId: decoded._id });

        res.clearCookie('userToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
        });

        // Send success response
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully.',
            status: 200,
            token: userToken,
        });

    } catch (error) {
        next(error);
    };
};

// ---------------- login with google ----------------- 
exports.redirectToGoogleProfile = async (req, res, next) => {
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
            message: 'Paste this URL into the browser for authentication',
            googleUrl,
        });
    } catch (error) {
        next(error);
    }
};
exports.getGoogleProfile = async (req, res, next) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ success: false, message: 'No authorization code provided' });
    }

    try {
        // Get OAuth tokens
        const { tokens } = await client.getToken(code);
        if (!tokens.id_token) throw new Error('No ID token received');

        client.setCredentials(tokens);

        // Verify ID token
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.CLIENT_ID,
        });
        const payload = ticket.getPayload();

        // Validate payload fields
        const googleId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'] || 'Unnamed User';
        const picture = payload['picture'] || null;

        if (!email || !googleId) {
            throw new Error('Invalid Google profile data');
        }

        // Upsert user in one query
        const user = await userModel.findOneAndUpdate(
            { email },
            {
                $setOnInsert: {
                    name,
                    email,
                    username: `User_${crypto.randomBytes(4).toString('hex')}`, // 8 chars, ~4M combos
                    profile_Picture: picture,
                    googleId, // Store for reference
                },
            },
            { upsert: true, new: true, lean: true }
        );

        // Check for existing session
        const sessionExists = await checkSession(user._id);
        if (sessionExists) {
            return res.status(409).json({
                success: false,
                message: 'User already logged in on another device',
            });
        }

        // Generate token and session
        const tokenPayload = { email, role: user.role || 'user', _id: user._id };
        const token = generateToken(tokenPayload);

        const deviceId = crypto.createHash('sha256')
            .update(`${req.ip}-${req.headers['user-agent']}-${Date.now()}`) // Add timestamp for uniqueness
            .digest('hex');
        await createSession(tokenPayload, token, deviceId);

        // Set secure cookie
        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 48 * 60 * 60 * 1000, // 48 hours
            sameSite: 'Strict',
        });

        // Clear cache if needed
        clearCache('node-cache');

        // Response
        return res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            userId: user._id,
            token,
        });

    } catch (error) {
        next(error);
    }
};

// -------------------- login with facebook -------------------
exports.redirectToFacebookProfile = (req, res, next) => {
    try {
        const client_id = process.env.FACEBOOK_APP_ID;
        const redirect_uri = process.env.FACEBOOK_REDIRECT_URI;

        const fbAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=email`;

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Paste this url into the browser for auth',
            fbAuthUrl,
        });
    } catch (error) {
        next(error);
    };
};
exports.getFacebookProfile = async (req, res, next) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ success: false, message: 'No code provided' });
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
        const { name, email } = userResponse.data;

        let user_ = await userModel.findOne({ email });
        if (!user_) {
            user_ = new userModel({
                name,
                email,
                username: `User_${crypto.randomBytes(2).toString('hex')}`,
            });
            await user_.save();
        };

        if (await checkSession(user._id)) {
            return res.status(409).json({
                success: false,
                status: 409,
                message: "Sorry! User is already logged in on another device.",
            });
        };

        const user = { email, role: user_.role, _id: user_._id }
        const token = generateToken(user);
        const deviceId = crypto.createHash("sha256")
            .update(req.ip + req.headers["user-agent"])
            .digest("hex");
        await createSession(user, token, deviceId); // Create a session for the user

        res.cookie('userToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 48, // 2 days
            sameSite: 'Strict',
        });

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Logged in successful...!',
            userId: id,
            token,
        });
    } catch (error) {
        next(error);
    };
};

// -------------------- user profile ---------------------

exports.userProfile = async (req, res, next) => {
    try {
        const profile = await userModel.findById(req.user._id)
            .select('-createdAt -updatedAt -__v -otp -otpExpiration -role -isVerified -password')
            .lean();

        if (!profile) {
            return res.status(404).json({ success: false, status: 404, message: 'Profile not found.' });
        };

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Profile fetched successfully.',
            profile
        });
    } catch (error) {
        next(error);
    };
};

exports.updateUser = async (req, res, next) => {
    try {
        const userId = req.user ? req.user._id : req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: "userId not found",
            });
        };
        const { profilePicture, ...userData } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'User not found!',
            });
        };

        if (profilePicture) {
            const isValidURL = isValidImageUrl(profilePicture);
            if (!isValidURL) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Invalid profile picture URL!',
                });
            };
            await user.updateProfilePicture(profilePicture);
        };

        Object.assign(user, userData);
        await user.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Updated successfully...',
            user,
        });
    } catch (error) {
        next(error);
    };
};

exports.deleteUser = async (req, res, next) => {
    try {
        const userId = req.user ? req.user._id : req.query.userId;
        if (!userId) {
            return res.status(404).json({
                success: true,
                status: 404,
                message: "userId not found",
            });
        };

        const deleteUser = await userModel.findByIdAndDelete(userId);
        if (!deleteUser) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'User not found!',
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Deleted successfully...',
            deleteUser,
        });
    } catch (error) {
        next(error);
    };
};
