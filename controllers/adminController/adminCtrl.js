const jwt = require('jsonwebtoken');
const Admin = require('../../models/adminModel/adminModel');
const { uploadImageOnCloudinary, deleteImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createAdmin = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        // Create and save new admin
        const newAdmin = await new Admin({
            username,
            email,
            password,
        }).save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            status: 201,
            message: "Admin user created successfully.",
            admin: newAdmin,
        });
    } catch (error) {
        next(error);
    };
};

exports.loginAdmin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find the admin by email
        const admin = await Admin.findOne({ email });
        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                status: 401,
                message: 'Invalid email or password',
            });
        };

        // Generate JWT token
        const token = jwt.sign(
            { _id: admin._id, role: admin.role, email: admin.email },
            process.env.ADMIN_SECRET_KEY,
            { expiresIn: '2d' }
        );

        // Set token in HTTP-only secure cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 1000 * 60 * 60 * 48, // 2 days
            sameSite: 'None',
            domain: "https://vle-app-frontend.onrender.com",
            path: "/",
        });

        // Respond with success
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Logged in successfully...!',
            adminId: admin._id,
            token,
        });

    } catch (error) {
        next(error);
    };
};

exports.getToken = (req, res, next) => {
    try {
        const token = req.cookies;
        if (!token) {
            return res.status(404).json({ success: false, message: "No token found" });
        };

        res.status(200).json({ success: true, token: token.adminToken });
    } catch (error) {
        res.status(500).json({ success: true, message: "Internal Server Error!", error });
    };
};

exports.adminProfile = async (req, res, next) => {
    try {
        const adminId = req.admin?._id;
        if (!adminId) {
            return res.status(404).json({
                success: false,
                message: 'Admin ID not found!',
            });
        };

        const adminProfile = await Admin.findById(adminId, '-createdAt -updatedAt -__v');
        if (!adminProfile) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Admin not found!',
            });
        };

        // Decrypt password
        const decryptedPassword = adminProfile.decryptPassword();
        const { password, ...profileWithoutPassword } = adminProfile.toObject();

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Profile fetched successfully.',
            adminProfile: {
                ...profileWithoutPassword,
                password: decryptedPassword,  // Send decrypted password
            },
        });
    } catch (error) {
        next(error);
    };
};

exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.admin?._id;
        if (!userId) return res.status(404).json({ success: false, message: "User ID not found!" });

        // Fetch admin profile by ID
        const admin = await Admin.findById(userId);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found!" });

        // Extract data from request body
        const { username, email, phone } = req.body;
        let imageData = admin.profilePicture; // Retain old image if no new one is uploaded

        // Handle image upload (delete old image if new one is uploaded)
        if (req.file) {
            if (admin.profilePicture?.public_id) {
                await deleteImageOnCloudinary(admin.profilePicture.public_id);
            };
            const data = await uploadImageOnCloudinary(req.file.path, 'VleProfiles');
            imageData = { url: data.secure_url, public_id: data.public_id }; // Set new image data
        }

        // Update admin profile
        admin.username = username || admin.username;
        admin.email = email || admin.email;
        admin.phone = phone ? phone.toString() : admin.phone;
        admin.profilePicture = imageData;

        await admin.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: "Profile updated successfully.",
            admin,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.logoutAdmin = async (req, res, next) => {
    try {
        const { adminToken } = req.cookies;

        if (!adminToken) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Admin is already logged out!',
            });
        };

        res.clearCookie('adminToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            path: '/',
            domain: "https://vle-app-frontend.onrender.com",
        });

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Logged out successfully.',
        });

    } catch (error) {
        next(error);
    };
};
