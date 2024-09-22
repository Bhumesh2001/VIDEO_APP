const Coupon = require('../../models/adminModel/coupan.adminModel');
const { generateCouponCode } = require('../../utils/coupanCode');

// Create a new coupon
exports.createCoupon = async (req, res) => {
    try {
        const { coupon_Code, discountPercentage, expirationDate, maxUsage, status } = req.body;
     
        if (!discountPercentage || !expirationDate || !maxUsage) {
            return res.status(400).json({
                success: false,
                message: 'discountPercentage, and expirationDate are required.'
            });
        };
        const couponCode = coupon_Code ? coupon_Code : generateCouponCode();

        const coupon = new Coupon({
            couponCode,
            discountPercentage,
            expirationDate,
            maxUsage,
            status
        });

        await coupon.save();

        res.status(201).json({
            success: true,
            message: 'Coupon created successfully.',
            coupon
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                errors: messages,
            });
        } else if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Coupan already exists!',
            });
        };
        res.status(500).json({
            success: false,
            message: 'Error occurred while creating the coupon.',
        });
    };
};

// Get all coupons
exports.getCoupons = async (req, res) => {
    try {
        // Fetch coupons and total count in parallel for efficiency
        const [coupons, totalCoupons] = await Promise.all([
            Coupon.find({}).sort({ createdAt: -1 }),
            Coupon.countDocuments()
        ]);

        // Check if no coupons were found
        if (coupons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Coupons not found!',
            });
        }

        res.status(200).json({
            success: true,
            totalCoupons,
            coupons
        });
    } catch (error) {
        console.error('Error retrieving coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving coupons.',
            error: error.message,
        });
    }
};

// Get a single coupon by ID
exports.getCouponById = async (req, res) => {
    try {
        const { couponId } = req.query;

        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found.',
            });
        };

        res.status(200).json({
            success: true,
            coupon,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving the coupon.',
        });
    }
};

// Update a coupon by ID
exports.updateCoupon = async (req, res) => {
    try {
        const { couponId } = req.query;
        const updateData = req.body;

        // Find and update the coupon with validation and return the updated coupon
        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { ...updateData, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        // If coupon not found
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Coupon updated successfully.',
            coupon
        });
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while updating the coupon.',
            error: error.message
        });
    }
};

// Delete a coupon by ID
exports.deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.query;
        const coupon = await Coupon.findByIdAndDelete(couponId);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found.',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Coupon deleted successfully.',
            coupon,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while deleting the coupon.',
        });
    };
};
