const jwt = require('jsonwebtoken');
const fs = require('fs').promises;

const Admin = require('../../models/adminModel/adminModel');
const { uploadImage, deleteImageOnCloudinary } = require('../../utils/uploadUtil');
const { isValidPassword, isValidImageUrl } = require('../../utils/validateUtil');

const adminProfileOptions = {
    folder: 'Profiles',
    transformation: [
        { width: 140, height: 140, crop: 'fill' }
    ],
};

exports.createAdmin = async (req, res) => {
    let imageData = null;
    try {
        const { username, email, password, phone, profilePicture } = req.body;

        // Validate password strength
        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be strong (include upper, lower case, number, and special character)',
            });
        }

        // Check if an admin already exists
        if (await Admin.exists()) {
            return res.status(409).json({
                success: false,
                message: "Admin already exists, cannot create another admin.",
            });
        }

        // Handle image validation and upload
        const fileUpload = req.files?.profilePicture?.tempFilePath;
        const imagePath = fileUpload || profilePicture;

        if (!imagePath || (profilePicture && !isValidImageUrl(profilePicture))) {
            return res.status(400).json({
                success: false,
                message: 'Valid image file or image URL is required!',
            });
        }

        imageData = await uploadImage(imagePath, adminProfileOptions);
        if (req.files?.profilePicture) await fs.unlink(req.files.profilePicture.tempFilePath);

        // Create and save new admin
        const newAdmin = await new Admin({
            username,
            email,
            password,
            phone,
            profilePicture: { url: imageData.url, public_id: imageData.public_id },
        }).save();

        res.status(201).json({
            success: true,
            message: "Admin user created successfully.",
            newAdmin,
        });
    } catch (error) {
        console.error('Error creating admin:', error);

        if (imageData?.public_id) await deleteImageOnCloudinary(imageData.public_id);

        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the admin by email
        const admin = await Admin.findOne({ email });
        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

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
            sameSite: 'Lax',
        });

        // Respond with success
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
    }
};

exports.adminProfile = async (req, res) => {
    try {
        const adminId = req.admin?._id;
        if (!adminId) {
            return res.status(404).json({
                success: false,
                message: 'Admin ID not found!',
            });
        }

        const adminProfile = await Admin.findById(adminId);
        if (!adminProfile) {
            return res.status(404).json({
                success: false,
                message: 'Admin profile not found!',
            });
        }

        // Decrypt password
        const decryptedPassword = adminProfile.decryptPassword();

        // Remove password from the profile object to avoid sending the encrypted version
        const { password, ...profileWithoutPassword } = adminProfile.toObject();

        res.status(200).json({
            success: true,
            message: 'Profile fetched successfully.',
            adminProfile: {
                ...profileWithoutPassword,
                password: decryptedPassword,  // Send decrypted password
            },
        });
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the admin profile.',
        });
    }
};

exports.updateProfile = async (req, res) => {
    let imageData = null; // Track image data for cleanup if needed

    try {
        const userId = req.admin._id;

        // Check for missing admin ID
        if (!userId) {
            return res.status(404).json({ success: false, message: 'User ID not found!' });
        }

        // Fetch admin profile by ID
        const admin = await Admin.findById(userId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found!' });
        }

        const { phone, profilePicture, ...adminData } = req.body;

        // Handle image input (from file or URL)
        const imagePath = req.files?.profilePicture?.tempFilePath || profilePicture;
        if (profilePicture) {
            // Validate URL format
            if (!isValidImageUrl(profilePicture)) {
                return res.status(400).json({ success: false, message: 'Invalid image URL!' });
            }
        }

        // Upload new image if provided (file or valid URL)
        if (imagePath) {
            // Remove previous image from Cloudinary if it exists
            if (admin.profilePicture.public_id) {
                await deleteImageOnCloudinary(admin.profilePicture.public_id);
            }

            // Upload new image to Cloudinary
            imageData = await uploadImage(imagePath, adminProfileOptions);

            // Delete the local temp file if uploaded via file
            if (req.files?.profilePicture) {
                await fs.unlink(req.files.profilePicture.tempFilePath);
            }
        }

        // Update phone and profile picture
        const dataToUpdate = {
            phone: phone ? phone.toString() : admin.phone, // Ensure phone is a string
            profilePicture: imageData
                ? { url: imageData.url, public_id: imageData.public_id } // New image data
                : admin.profilePicture, // Retain existing image if not updated
            ...adminData // Spread other fields from request
        };

        // Merge the updated data into the admin object
        Object.assign(admin, dataToUpdate);
        await admin.save(); // Save the updated admin profile

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            admin,
        });
    } catch (error) {
        console.error('Error updating profile:', error);

        // Clean up image if an error occurs after uploading it
        if (imageData?.public_id) {
            await deleteImageOnCloudinary(imageData.public_id);
        }

        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the profile.',
            error: error.message,
        });
    }
};

exports.logoutAdmin = async (req, res) => {
    try {
        const { adminToken } = req.cookies;

        if (!adminToken) {
            return res.status(400).json({
                success: false,
                message: 'Admin is already logged out!',
            });
        }

        res.clearCookie('adminToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            path: '/',
        });

        res.status(200).json({
            success: true,
            message: 'Admin logged out successfully.',
        });

    } catch (error) {
        console.error('Logout exception:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to log out due to an exception.',
        });
    }
};
