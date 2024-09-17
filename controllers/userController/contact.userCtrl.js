const ContactUseModel = require('../../models/userModel/contact.userModel');

// Create a new contact user
exports.createContactUser = async (req, res) => {
    try {
        const { name, email, phone, city, district, state, country, pincode, message } = req.body;
        const contact_user = {
            userId: req.user._id,
            name, email, phone,
            address: {
                city, district, state, country, pincode,
            },
            message,
        };
        const contactUser = new ContactUseModel(contact_user);
        await contactUser.save();

        res.status(201).json({
            success: true,
            message: 'Contact user created successfully!',
            contactUser,
        });
    } catch (error) {
        console.log(error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: Object.values(error.errors).map(err => err.message),
            });
        };
        res.status(500).json({
            success: false,
            message: 'Server error, failed to create contact user',
            error: error.message,
        });
    };
};

// Get all constact users
exports.getAllContactUsers = async (req, res) => {
    try {
        const users = await ContactUseModel.find();
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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact users',
            error: error.message,
        });
    };
};

// Get a contact user by ID
exports.getContactUserById = async (req, res) => {
    try {
        const contactUser = await ContactUseModel.findOne({ userId: req.params.userId });
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
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID',
            });
        };
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact user',
            error: error.message,
        });
    };
};

// Update a contact user by ID
exports.updateContactUserById = async (req, res) => {
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

        res.status(200).json({
            success: true,
            message: 'Contact user updated successfully',
            user,
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: Object.values(error.errors).map(err => err.message),
            });
        };
        res.status(500).json({
            success: false,
            message: 'Failed to update contact user',
            error: error.message,
        });
    };
};

// Delete a contact user by ID
exports.deleteContactUserById = async (req, res) => {
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

        res.status(200).json({
            success: true,
            message: 'Contact user deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete contact user',
            error: error.message,
        });
    };
};
