const Banner = require('../../models/adminModel/banner.adminModlel');
const {
    uploadImageToCloudinary,
    deleteImageAndUploadToCloudinary,
    deleteImageOnCloudinary,
} = require('../../utils/uploadImage');

exports.createBanner = async (req, res) => {
    let { title, description, image } = req.body;

    try {
        // Perform a case-insensitive search for the title
        const existingBanner = await Banner.findOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } });

        if (existingBanner) {
            return res.status(409).json({
                success: false,
                message: 'Banner already exists!',
            });
        };

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

        const imageData = await uploadImageToCloudinary(image);

        const bannerObj = {
            title,
            description,
            public_id: imageData.public_id,
            image: imageData.url,
        };

        const newBanner = new Banner(bannerObj);
        await newBanner.save();

        res.status(201).json({
            success: true,
            message: 'Banner created successfully',
            banner: newBanner
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
                message: `Banner already exists!`,
            });
        };
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find({} ,{
            __v: 0, createdAt: 0, updatedAt: 0,
        });
        const totalBanners = await Banner.countDocuments();
        res.status(200).json({
            success: true,
            message: 'Banners fetched successfully...',
            banners,
            totalBanners
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

        const public_id = bannerData.public_id;
        const imageData = await deleteImageAndUploadToCloudinary(public_id, image);

        const bannerUpdates = {
            title,
            description,
            public_id: imageData.public_id,
            image: imageData.url,
            status,
            updatedAt: Date.now(),
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
