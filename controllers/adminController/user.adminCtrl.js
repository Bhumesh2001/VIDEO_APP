const userModel = require('../../models/userModel/userModel');
const crypto = require('node:crypto');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');
const { isValidPassword } = require('../../utils/validateUtil');

exports.createUserByAdmin = async (req, res, next) => {
    try {
        const { name, email, password, username, mobileNumber, status } = req.body;
        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'Password must be strong!',
            });
        }

        const newUser = new userModel({
            name,
            email,
            password,
            username: username ? username : `User_${crypto.randomBytes(2).toString('hex')}`,
            mobileNumber,
            status: status ? status.toLowerCase() : 'inactive',
        });
        const savedUser = await newUser.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            status: 200,
            message: "Account created successfully",
            user: savedUser,
        });

    } catch (error) {
        next(error);
    };
};

exports.getAllUsersByAdmin = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page)) || 1; // Ensure page is at least 1
        const limit = Math.max(1, parseInt(req.query.limit)) || 10; // Ensure limit is at least 1
        const skip = (page - 1) * limit;

        // Fetch users with pagination and sorting
        const [users, totalUsers] = await Promise.all([
            userModel.find({}, {
                name: 1,
                email: 1,
                mobileNumber: 1,
                status: 1,
                profile_Picture: 1,
                status: 1
            })
                .sort({ createdAt: -1 }) // Ensure createdAt is indexed
                .skip(skip)
                .limit(limit)
                .lean(),
            userModel.countDocuments(), // Count total users
        ]);

        // Return response
        res.status(200).json({
            success: true,
            status: 200,
            message: "Users fetched successfully",
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            page,
            users,
        });
    } catch (error) {
        next(error);
    }
};

exports.getSingleUserByAdmin = async (req, res, next) => {
    try {
        const { userId } = req.query;

        const user = await userModel.findById(userId)
            .select('name email mobileNumber profile_Picture status password')
            .lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "User not found!",
            });
        };
        res.status(200).json({
            success: true,
            status: 404,
            message: "Users fetched successfully...",
            user,
        });
    } catch (error) {
        next(error);
    };
};

exports.updateUserByAdmin = async (req, res, next) => {
    try {
        const { userId } = req.query;
        const updates = req.body;

        const user = await userModel.findByIdAndUpdate(
            userId,
            { ...updates, updatedAt: Date.now() },
            { new: true, runValidators: true },
        );
        if (!user) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "User not found!",
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: "User updated successfully...",
            user,
        });
    } catch (error) {
        next(error);
    };
};

exports.deleteUserByAdmin = async (req, res, next) => {
    try {
        const { userId } = req.query;

        const user = await userModel.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "User not found!",
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: "User deleted successfully...",
            user,
        });
    } catch (error) {
        next(error);
    };
};
