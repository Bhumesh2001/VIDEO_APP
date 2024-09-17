const jwt = require('jsonwebtoken');
const Admin = require('../../models/adminModel/adminModel');

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

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        };

        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        };

        const token = jwt.sign(
            {
                _id: admin._id,
                role: admin.role,
                email: admin.email, 
            },
            process.env.ADMIN_SECRET_KEY,
            { expiresIn: '2d' }
        );

        req.session.adminToken = token;

        res.status(200).json({
            success: true,
            message: 'Admin logged in successfully',
            adminId: admin._id,
            token,
        });

    } catch (error) {
        console.error('Error during admin login:', error.message);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login. Please try again later.',
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
        const adminToken = req.session.adminToken;
        if (adminToken) {
            req.session.destroy(err => {
                if (err) return res.status(500).json({ message: 'Logout failed.' });
                return res.status(200).json({
                    success: true, 
                    message: 'Admin logged out successfully.', 
                    adminToken,
                });
            });
        } else {
            return res.status(400).json({ 
                success: false,
                message: 'Admin is already logged out.', 
            });
        };
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: true,
            message: 'error occured while login out',
            error: error.message,
        });
    };
};