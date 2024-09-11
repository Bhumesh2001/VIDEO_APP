const userModel = require('../../models/userModel/userModel');

exports.createUserByAdmin = async (req, res) => {
    try {
        const { name, email, password, mobileNumber, status } = req.body;

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be strong (include upper, lower, number, and special character)',
            });
        };

        const user = new userModel({
            name,
            email,
            password,
            mobileNumber,
            status: status.toLowerCase(),
        });
        await user.save();

        res.status(200).json({
            success: true,
            message: "Account created successfully...",
            user,
        });

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'User already exists',
            });
        };
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getAllUsersByAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const users = await userModel.find({})
            .skip(skip)
            .limit(limit);

        const totalUsers = await userModel.countDocuments();

        if (!users.length) {
            return res.status(404).json({
                success: false,
                message: "No users found!",
            });
        };

        res.status(200).json({
            success: true,
            message: "Users fetched successfully...",
            totalUsers,
            page,
            totalPages: Math.ceil(totalUsers / limit),
            users,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching the users',
            error: error.message,
        });
    };
};

exports.getSingleUserByAdmin = async (req, res) => {
    try {
        const { userId } = req.query;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found!",
            });
        };
        res.status(200).json({
            success: true,
            message: "Users fetched successfully...",
            user,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while fetching the user',
            error,
        });
    };
};

exports.updateUserByAdmin = async (req, res) => {
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
                message: "User not found!",
            });
        };
        res.status(200).json({
            success: true,
            message: "User updated successfully...",
            user,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while updating the user',
            error,
        });
    };
};

exports.deleteUserByAdmin = async (req, res) => {
    try {
        const { userId } = req.query;

        const user = await userModel.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found!",
            });
        };
        res.status(200).json({
            success: true,
            message: "User deleted successfully...",
            user,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while deleting the user',
            error,
        });
    };
};
