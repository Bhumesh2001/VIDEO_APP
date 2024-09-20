const cloudinary = require('cloudinary').v2
const Banner = require('../../models/adminModel/banner.adminModlel');
const {
    deleteImageAndUploadToCloudinary,
    deleteImageOnCloudinary,
    imageToBuffer,
    uploadArticleImageToCloudinary,
    resizeImage,
} = require('../../utils/uploadImage');


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

        if (image) {
            const aspect_ratio = {
                width: 1280,
                height: 720,
            };
            const folderName = 'Banners';
            const format = req.files.image.mimetype.split('/')[1];

            const imageBuffer = await imageToBuffer(image);
            const resizedBuffer = await resizeImage(imageBuffer, aspect_ratio.width, aspect_ratio.height);

            imageData = await uploadArticleImageToCloudinary(resizedBuffer, format, aspect_ratio, folderName);
        };

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
        if (imageData && imageData.public_id) {
            try {
                await cloudinary.uploader.destroy(imageData.public_id, { resource_type: 'image' });
            } catch (cleanupError) {
                console.error('Error deleting image from Cloudinary during cleanup:', cleanupError);
            };
        };

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const skip = (page - 1) * limit;

        const banners = await Banner.find({}, {
            __v: 0, createdAt: 0, updatedAt: 0,
        }).sort({ publishedAt: -1 }).skip(skip).limit(limit);

        const totalBanners = await Banner.countDocuments();

        res.status(200).json({
            success: true,
            message: 'Banners fetched successfully...',
            totalBanners,
            totalPages: Math.ceil(totalBanners / limit),
            page,
            banners,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    };
};

exports.getSingleBanner = async (req, res) => {
    const { bannerId } = req.query;

    try {
        const banner = await Banner.findById(bannerId);
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

    try {
        if (!(req.files && req.files.image) && !req.body.image) {
            return res.status(400).json({
                success: false,
                message: 'Image file or image URL is required!',
            });
        };

        if (req.files && req.files.image) {
            image = req.files.image.tempFilePath;
        } else {
            if (!/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image URL!',
                });
            };
        };

        const bannerData = await Banner.findById(bannerId);
        if (!bannerData) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found!',
            });
        };

        const bannerUpdates = {
            title,
            description,
            status,
            updatedAt: Date.now(),
        };

        if (image) {
            const aspect_ratio = {
                width: 1280,
                height: 720,
            };
            const folderName = 'Banners';
            const format = req.files.image.mimetype.split('/')[1];

            const imageBuffer = await imageToBuffer(image);
            const resizedBuffer = await resizeImage(imageBuffer, aspect_ratio.width, aspect_ratio.height);

            const public_id = bannerData.public_id;
            const updateData = { resizedBuffer, format, aspect_ratio, folderName, public_id }
            const imageData = await deleteImageAndUploadToCloudinary(updateData);

            bannerUpdates['image'] = imageData.url;
            bannerUpdates['public_id'] = imageData.public_id;
        };

        const banner = await Banner.findByIdAndUpdate(
            bannerId,
            bannerUpdates,
            { new: true, runValidators: true },
        );

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        };

        res.status(200).json({
            success: true,
            message: 'Banner updated successfully',
            banner,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    };
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
        deleteImageOnCloudinary(public_id);

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
