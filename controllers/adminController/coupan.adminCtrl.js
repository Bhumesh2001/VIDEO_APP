const Coupon = require('../../models/adminModel/coupan.adminModel');
const { generateCouponCode } = require('../../utils/coupanCode');

// Create a new coupon
exports.createCoupon = async (req, res) => {
    try {
        const { discountPercentage, expirationDate, maxUsage } = req.body;

        if (!discountPercentage || !expirationDate) {
            return res.status(400).json({
                success: false,
                message: 'Code, discountPercentage, and expirationDate are required.'
            });
        };
        const code = generateCouponCode();

        const coupon = new Coupon({
            code,
            discountPercentage,
            expirationDate,
            maxUsage,
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
        const coupons = await Coupon.find({});
        if(!coupons){
            return res.status(404).json({
                success: true,
                message: 'Coupan not found!',
            });
        };

        res.status(200).json({
            success: true,
            coupons
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving coupons.',
        });
    }
};

// Get a single coupon by ID
exports.getCouponById = async (req, res) => {
    try {
        const couponId = req.query.couponId || req.body.couponId;

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
        const { code, discountPercentage, expirationDate, maxUsage } = req.body;

        const { couponId } = req.query? req.query : req.body;

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { code, discountPercentage, expirationDate, maxUsage, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found.',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Coupon updated successfully.',
            coupon
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while updating the coupon.',
        });
    };
};

// Delete a coupon by ID
exports.deleteCoupon = async (req, res) => {
    try {
        const couponId = req.query.couponId || req.body.couponId;
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
