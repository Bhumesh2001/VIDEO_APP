const Coupon = require('../../models/adminModel/coupan.adminModel');
const { generateCouponCode } = require('../../utils/coupanCode');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

// Create a new coupon
exports.createCoupon = async (req, res, next) => {
    try {
        const { coupon_Code, expirationDate, maxUsage } = req.body;

        // Check if the coupon already exists
        const existingCoupon = await Coupon.findOne({ couponCode: coupon_Code }).lean();
        if (existingCoupon) {
            return res.status(409).json({
                success: false,
                status: 409,
                message: "Coupon already exists!",
            });
        }

        // Generate a coupon code if not provided
        const couponCode = coupon_Code || generateCouponCode(); // Ensure generateCouponCode is defined

        // Validate and convert expirationDate to a Date object
        const expirationDateObj = new Date(expirationDate);
        if (isNaN(expirationDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: "Invalid expirationDate format!",
            });
        }

        // Create and save the coupon
        const coupon = new Coupon({
            couponCode,
            expirationDate: expirationDateObj, // Store as Date object
            maxUsage,
        });
        await coupon.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            status: 201,
            message: 'Coupon created successfully!',
            coupon,
        });
    } catch (error) {
        next(error);
    }
};

// Get all coupons
exports.getCoupons = async (req, res, next) => {
    try {
        // Fetch coupons and total count in parallel for efficiency
        const [coupons, totalCoupons] = await Promise.all([
            Coupon.find({}, { createdAt: 0, updatedAt: 0, __v: 0 }).sort({ createdAt: -1 }).lean(),
            Coupon.countDocuments(),
        ]);

        // Check if no coupons were found
        if (coupons.length === 0) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Coupons not found!',
            });
        }

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Coupon fetched successfully...!',
            totalCoupons,
            coupons
        });
    } catch (error) {
        next(error);
    };
};

// Get a single coupon by ID
exports.getCouponById = async (req, res, next) => {
    try {
        const { couponId } = req.query;

        const coupon = await Coupon.findById(couponId).select('-createdAt -updatedAt -__v').lean();
        if (!coupon) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Coupon not found.',
            });
        };

        res.status(200).json({
            success: true,
            status: 200,
            message: "Coupon fetched successfully...!",
            coupon,
        });
    } catch (error) {
        next(error);
    };
};

// Update a coupon by ID
exports.updateCoupon = async (req, res, next) => {
    const { couponId } = req.query;
    const { expirationDate, ...couponData } = req.body;

    try {
        const updateData = {
            expirationDate: new Date(expirationDate),
            ...couponData,
            updatedAt: Date.now(),
        };

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!coupon) {
            return res.status(404).json({ success: false, status: 404, message: 'Coupon not found.' });
        }

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Coupon updated successfully.',
            coupon
        });
    } catch (error) {
        next(error);
    };
};

// Delete a coupon by ID
exports.deleteCoupon = async (req, res, next) => {
    try {
        const { couponId } = req.query;
        const coupon = await Coupon.findByIdAndDelete(couponId);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Coupon not found.',
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Coupon deleted successfully.',
            coupon,
        });
    } catch (error) {
        next(error);
    };
};
