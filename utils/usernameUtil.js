const User = require('../models/userModel/userModel');
const crypto = require('crypto');

exports.validateUsername = async (username) => {
    // Check length
    if (username.length < 3 || username.length > 20) {
        return {
            valid: false,
            message: 'Username must be between 3 and 20 characters long.'
        };
    }

    // Check allowed characters
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        return {
            valid: false,
            message: 'Username can only contain letters, numbers, and underscores.'
        };
    }

    // Check uniqueness in the database
    const existingUser = await User.findOne({ username }).lean().exec();
    if (existingUser) {
        return {
            valid: false,
            message: 'Username is already taken, please choose another one.'
        };
    }

    // If all checks pass
    return {
        valid: true,
        message: 'Username is valid.'
    };
};

const generateRandomUsername = (baseName) => {
    const suffix = crypto.randomBytes(4).toString('hex'); 
    return `${baseName}_${suffix}`;
};

exports.updateUsernames = async () => {
    try {
        const users = await User.find({});

        for (const user of users) {
            const baseUsername = user.name.replace(/\s+/g, '_');
            let newUsername = generateRandomUsername(baseUsername);

            while (await User.exists({ username: newUsername })) {
                newUsername = generateRandomUsername(baseUsername);
            }

            user.username = newUsername;
            await user.save();
        }

        console.log('All usernames updated successfully.');
    } catch (error) {
        console.error('Error updating usernames:', error);
    }
};