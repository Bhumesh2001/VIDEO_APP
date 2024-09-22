const Banner = require('../../models/adminModel/banner.adminModlel');
const { deleteImageOnCloudinary } = require('../../utils/uploadImage');
const fs = require('fs').promises;

const { uploadImage } = require('../../utils/uploadUtil');

const bannerOptions = {
    folder: 'Banners',
    transformation: [
        { width: 1280, height: 720, crop: 'fill' }
    ],
};

exports.createBanner = async (req, res) => {
    let { title, description, image, status } = req.body;
    let imageData = null;  // Initialize imageData here to use later for cleanup

    try {
        const existingBanner = await Banner.findOne({ title });

        if (existingBanner) {
            return res.status(409).json({
                success: false,
                message: 'Banner already exists!',
            });
        };

        // Check if image file or URL is provided
        if (!(req.files && req.files.image) && !req.body.image) {
            return res.status(400).json({
                success: false,
                message: 'Image file or image URL is required!',
            });
        };

        // Handle image file upload or URL validation
        if (req.files && req.files.image) {
            image = req.files.image.tempFilePath;
        } else {
            // Validate image URL format
            const isValidImageUrl = /^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image);
            if (!isValidImageUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image URL!',
                });
            };
        };

        if (image) imageData = await uploadImage(image, bannerOptions);

        if (req.files.image) await fs.unlink(req.files.image.tempFilePath);

        const bannerObj = {
            title,
            description,
            public_id: imageData.public_id,
            image: imageData.url,
            status,
        };

        // Save new banner to the database
        const newBanner = new Banner(bannerObj);
        await newBanner.save();

        // Respond with success message
        res.status(201).json({
            success: true,
            message: 'Banner created successfully',
            banner: newBanner,
        });

    } catch (error) {
        console.error('Error creating banner:', error);

        // Cleanup the image from Cloudinary if it was uploaded but there was a failure
        if (imageData && imageData.public_id) deleteImageOnCloudinary(imageData.public_id);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };

        // Handle duplicate error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Banner already exists!',
            });
        };

        // General server error response
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getAllBanners = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const skip = (page - 1) * limit;

        const [banners, totalBanners] = await Promise.all([
            Banner.find({}, { __v: 0, createdAt: 0, updatedAt: 0 })
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limit),
            Banner.countDocuments(),
        ]);

        res.status(200).json({
            success: true,
            message: 'Banners fetched successfully...',
            totalBanners,
            totalPages: Math.ceil(totalBanners / limit),
            page,
            banners,
        });
    } catch (error) {
        console.error(error);  // Log error for debugging
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

exports.getSingleBanner = async (req, res) => {
    const { bannerId } = req.query;

    try {
        const banner = await Banner.findById(bannerId).exec();
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        };
        res.status(200).json({
            success: true,
            message: 'banner fetched successfully...',
            banner,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    };
};

exports.updateBanner = async (req, res) => {
    const { bannerId } = req.query;
    let { title, description, image, status } = req.body;
    let imageData = null;

    try {
        // Check for existing banner
        const bannerData = await Banner.findById(bannerId);
        if (!bannerData) {
            return res.status(404).json({ success: false, message: 'Banner not found!' });
        }

        // Handle file upload or image URL
        if (req.files && req.files.image) {
            image = req.files.image.tempFilePath;
        } else if (image && !/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image)) {
            return res.status(400).json({ success: false, message: 'Invalid image URL!' });
        }

        // Prepare banner updates
        const bannerUpdates = {
            title,
            description,
            status,
            updatedAt: Date.now(),
            image: bannerData.image,
            public_id: bannerData.public_id,
        };

        // Upload new image if provided
        if (image) {
            if (bannerData.public_id) {
                await deleteImageOnCloudinary(bannerData.public_id);
            }
            imageData = await uploadImage(image, bannerOptions);
            bannerUpdates.image = imageData.url;
            bannerUpdates.public_id = imageData.public_id;

            // Remove temporary image file if uploaded
            if (req.files.image) {
                await fs.unlink(req.files.image.tempFilePath);
            }
        }

        // Update the banner
        const updatedBanner = await Banner.findByIdAndUpdate(bannerId, bannerUpdates, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            message: 'Banner updated successfully',
            banner: updatedBanner,
        });
    } catch (error) {
        console.error(error);

        if (imageData && imageData.public_id) {
            await deleteImageOnCloudinary(imageData.public_id);
        }

        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

exports.deleteBanner = async (req, res) => {
    const { bannerId } = req.query;

    try {
        const banner = await Banner.findByIdAndDelete(bannerId);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        };

        const public_id = banner.public_id;
        if (public_id) await deleteImageOnCloudinary(public_id);

        res.status(200).json({
            success: true,
            message: 'Banner deleted successfully',
            banner,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    };
};
