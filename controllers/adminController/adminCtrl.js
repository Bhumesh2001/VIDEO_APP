const jwt = require('jsonwebtoken');
const busboy = require("busboy");
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
            sameSite: 'Strict',
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
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID not found!" });
        }

        // 🔹 Fetch existing admin profile
        const admin = await Admin.findById(userId);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found!" });
        }

        const bb = busboy({ headers: req.headers });

        let updatedData = {
            username: admin.username,
            email: admin.email,
            phone: admin.phone,
            profilePicture: admin.profilePicture || { url: null, public_id: null },
        };

        let fileUploadPromises = [];
        let isFileUploaded = false;

        // ✅ Handle text fields (username, email, phone)
        bb.on("field", (name, value) => {
            if (["username", "email", "phone"].includes(name) && value !== admin[name]) {
                updatedData[name] = value;
            }
        });

        // ✅ Handle file uploads (profile picture)
        bb.on("file", (name, file, info) => {
            if (!info.filename) {
                file.resume(); // ✅ Drain the empty file
                return;
            }

            if (name === "profilePicture") {
                isFileUploaded = true;
                fileUploadPromises.push(
                    uploadImageOnCloudinary(file, "VleProfiles").then(async (data) => {
                        // ✅ Delete old image if a new one is uploaded
                        if (admin.profilePicture?.public_id) {
                            await deleteImageOnCloudinary(admin.profilePicture.public_id);
                        }
                        updatedData.profilePicture = { url: data.secure_url, public_id: data.public_id };
                    }).catch((err) => console.error("File Upload Error:", err))
                );
            }
        });

        // ✅ When all files & fields are processed
        bb.on("finish", async () => {
            try {
                await Promise.all(fileUploadPromises); // ✅ Ensure all uploads complete

                // ✅ Only update fields if changes are detected
                if (
                    updatedData.username !== admin.username ||
                    updatedData.email !== admin.email ||
                    updatedData.phone !== admin.phone ||
                    (isFileUploaded && updatedData.profilePicture.url !== admin.profilePicture?.url)
                ) {
                    const updatedAdmin = await Admin.findByIdAndUpdate(userId, updatedData, {
                        new: true,
                        runValidators: true,
                    });

                    clearCache("node-cache"); // ✅ Clear cache after update

                    return res.status(200).json({
                        success: true,
                        message: "Profile updated successfully!",
                        admin: updatedAdmin,
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "No changes were made.",
                    admin,
                });

            } catch (error) {
                next(error);
            }
        });

        req.pipe(bb); // ✅ Ensure Busboy processes the request

    } catch (error) {
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
            sameSite: 'Strict',
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
