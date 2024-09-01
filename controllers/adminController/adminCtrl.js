const jwt = require('jsonwebtoken');
const Admin = require('../../models/adminModel/adminModel');

// -------------- signup/login -----------------

exports.adminLoginPage = (req, res) => {
    try {
        res.redirect('https://digital-vle-admin-login.netlify.app');
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Server error!',
            error,
        });
    };
};

exports.adminDashboard = (req, res) => {
    try {
        res.redirect('https://web-digital-vle.netlify.app');
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Server error!',
            error,
        });
    };
};

exports.createAdmin = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'username, email and passowrd are required',
            });
        };
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be strong (include upper, lower, number, and special character)',
            });
        };
        const existsAdmin = await Admin.countDocuments();

        if (existsAdmin === 1) {
            return res.status(409).json({
                success: false,
                message: "Admin already created, you can't make admin.",
            });
        } else {
            const newAdmin = new Admin(req.body);
            await newAdmin.save();
            console.log('Admin user created successfully');
        };

        res.status(201).json({
            success: true,
            message: "Admin user created successfully...",
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

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.',
            });
        };
        const admin = await Admin.findOne({ email });

        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email and password',
            });
        };
        const token = jwt.sign({
            email: admin.email,
            role: admin.role,
            _id: admin._id,
        }, process.env.ADMIN_SECRET_KEY, { expiresIn: '6h' });

        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only send cookie over HTTPS in production
            maxAge: 6 * 60 * 60 * 1000 // 6 hours in milliseconds
        });

        res.status(200).json({
            success: true,
            message: 'Admin logged in successful...',
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error occured while login the admin',
        });
    };
};
