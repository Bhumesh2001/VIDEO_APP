const Banner = require('../../models/adminModel/banner.adminModlel');

exports.createBanner = async (req, res) => {
    const { title, description, imageUrl, active } = req.body;

    try {
        const newBanner = new Banner({
            title,
            description,
            imageUrl,
            active,
        });
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
        const banners = await Banner.find({});
        const totalBanners = await Banner.countDocuments();
        const response = {
            totalBanners,
            banners,
        };
        res.status(200).json({
            success: true,
            message: 'Banners fetched successfully...',
            banners: response,
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
    const { bannerId } = req.query || req.body;

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
    const { bannerId } = req.query || req.body;
    const { title, description, imageUrl, active } = req.body;

    try {
        const banner = await Banner.findByIdAndUpdate(
            bannerId,
            { title, description, imageUrl, active, updatedAt: Date.now() },
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
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    };
};

exports.deleteBanner = async (req, res) => {
    const { bannerId } = req.query || req.body;

    try {
        const banner = await Banner.findByIdAndDelete(bannerId);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        };

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
