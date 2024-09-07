const jwt = require('jsonwebtoken');
const Admin = require('../../models/adminModel/adminModel');

exports.renderLoginpage = (req, res) => {
    try {
        res.render('login');
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server error!',
            error,
        });
    };
};

exports.createAdmin = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be strong (include upper, lower, number, and special character)',
            });
        };

        const existsAdmin = await Admin.countDocuments();
        let newAdmin;
        if (existsAdmin === 1) {
            return res.status(409).json({
                success: false,
                message: "Admin already created, you can't make admin.",
            });
        } else {
            newAdmin = new Admin({
                username, email, password
            });
            await newAdmin.save();
        };

        res.status(201).json({
            success: true,
            message: "Admin user created successfully...",
            newAdmin,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    };
};

exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email and password',
            });
        };
        const token = jwt.sign(
            {
                email: admin.email,
                role: admin.role,
                _id: admin._id,
            },
            process.env.ADMIN_SECRET_KEY,
            { expiresIn: '6h' }
        );

        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 6 * 60 * 60 * 1000,
            path: '/',
        });

        res.status(200).json({
            success: true,
            message: 'Admin logged in successful...',
            token,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error occured while login the admin',
        });
    };
};

exports.adminProfile = async (req, res) => {
    try {
        const adminId = req.admin._id;
        if (!adminId) {
            return res.status(404).json({
                success: false,
                message: 'adminId not found!',
            });
        };
        const adminProfile = await Admin.findById(adminId);
        if (!adminProfile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'Profile fetched successfully...',
            adminProfile,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while fetching the adminProfile',
        });
    };
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.admin._id;
        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'userId not found!',
            });
        };
        const admin = await Admin.findById(userId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'User not found!',
            });
        };

        const { profilePicture, ...adminData } = req.body;

        if (profilePicture) {
            const isValidURL = /^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(profilePicture);
            if (!isValidURL) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid profile picture URL! Profile should be match jpg, jpeg, png, gif, webp, tiff',
                });
            };
            await admin.updateProfilePicture(profilePicture);
        };

        Object.assign(admin, adminData);
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'User updated successfully...',
            admin,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: true,
            message: 'error occured while updating the profile',
            error: error.message,
        });
    };
};

exports.LogoutAdmin = async (req, res) => {
    try {
        res.clearCookie('adminToken', { httpOnly: true, secure: true, path: '/' });
        const adminToken = req.cookies.adminToken;
        res.status(200).json({
            success: true,
            message: 'Admin Logged out successfully...',
            adminToken,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: true,
            message: 'error occured while login out',
            error: error.message,
        });
    };
};