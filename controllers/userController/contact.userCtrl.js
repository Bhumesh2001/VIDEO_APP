const ContactUseModel = require('../../models/userModel/contact.userModel');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

// Create a new contact user
exports.createContactUser = async (req, res, next) => {
    const { name, email, phone, city, district, state, country, pincode, message } = req.body;
    try {
        // Create contact user object with nested address
        const contactUser = new ContactUseModel({
            userId: req.user._id,
            name,
            email,
            phone,
            address: { city, district, state, country, pincode },
            message
        });
        await contactUser.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            message: 'Contact user created successfully!',
            contactUser,
        });
    } catch (error) {
        next(error);
    }
};

// Get all constact users
exports.getAllContactUsers = async (req, res, next) => {
    try {
        const users = await ContactUseModel.find({}, { createdAt: 0, updatedAt: 0, __v: 0 }).lean();
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contact user not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'Conatact users fetched successfully...!',
            users,
        });
    } catch (error) {
        next(error);
    };
};

// Get a contact user by ID
exports.getContactUserById = async (req, res, next) => {
    try {
        const contactUser = await ContactUseModel.findOne(
            { userId: req.params.userId },
            { createdAt: 0, updatedAt: 0, __v: 0 })
            .lean();
        if (!contactUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Conatact user fetched successfully...!',
            contactUser,
        });
    } catch (error) {
        next(error);
    };
};

// Update a contact user by ID
exports.updateContactUserById = async (req, res, next) => {
    try {
        const user = await ContactUseModel.findOneAndUpdate({ userId: req.params.userId }, req.body, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Contact user updated successfully',
            user,
        });
    } catch (error) {
        next(error);
    };
};

// Delete a contact user by ID
exports.deleteContactUserById = async (req, res, next) => {
    try {
        const user = await ContactUseModel.findOneAndDelete(
            { userId: req.params.userId },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Contact user deleted successfully',
        });
    } catch (error) {
        next(error);
    };
};
