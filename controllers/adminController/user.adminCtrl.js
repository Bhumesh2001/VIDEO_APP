const userModel = require('../../models/userModel/userModel');
const { updateUsernames, validateUsername } = require('../../utils/usernameUtil');

exports.createUserByAdmin = async (req, res) => {
    try {
        const { name, email, password, username, mobileNumber, status } = req.body;

        const { valid, message } = await validateUsername(username);
        if (!valid) {
            return {
                success: false,
                message,
            };
        }

        // Strong password validation regex (at least one upper, one lower, one number, and one special character)
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be strong (include upper, lower, number, and special character)',
            });
        }

        const newUser = new userModel({
            name,
            email,
            password,
            username,
            mobileNumber,
            status: status ? status.toLowerCase() : 'inactive',
        });

        const savedUser = await newUser.save();

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: savedUser,
        });

    } catch (error) {
        console.error('Error creating user:', error);

        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error occurred while creating user',
            error: error.message,
        });
    }
};

exports.getAllUsersByAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Fetch users with pagination and sorting
        const [users, totalUsers] = await Promise.all([
            userModel.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            userModel.countDocuments()
        ]);

        if (!users.length) {
            return res.status(404).json({
                success: false,
                message: "No users found!",
            });
        }

        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            page,
            users,
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching users',
            error: error.message,
        });
    }
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

exports.updateAllUser = async (req, res) => {
    try {
        await updateUsernames();
        res.status(200).json({ message: 'API call successful, usernames updated.' });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Internal serve error',
            error: error.message,
        })
    }
};
