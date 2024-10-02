const Coupon = require('../../models/adminModel/coupan.adminModel');
const CouponApplication = require('../../models/userModel/coupon.userModel');

exports.getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.aggregate([
            { $sample: { size: 1 } },
            {
                $project: {
                    couponCode: 1,
                    discountPercentage: 1,
                    expirationDate: 1,
                    maxUsage: 1,
                    usageCount: 1,
                    status: 1,
                }
            }
        ]);
        if (!coupon.length) {
            return res.status(404).json({
                success: false,
                message: 'coupon not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'coupon fetched successfully...',
            coupon: coupon[0],
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: true,
            message: 'error occured while fetching the coupon',
        });
    };
};

exports.applyCoupon = async (req, res) => {
    try {
        const { couponCode, totalPrice } = req.body;
        const userId = req.user._id;

        // Validate userId
        if (!userId) {
            return res.status(404).json({ success: false, message: 'User ID not found!' });
        }

        // Fetch the coupon
        const coupon = await Coupon.findOne({
            couponCode,
            status: 'Active',
            expirationDate: { $gt: Date.now() }
        }).lean().exec();

        // Validate coupon
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
        }

        // Check if coupon is already applied
        const existingCouponApplication = await CouponApplication.findOne({ userId, couponCode }).lean().exec();
        if (existingCouponApplication) {
            return res.status(409).json({
                success: false,
                message: 'CouponCode already applied!',
                discount: coupon.discountPercentage,
                finalPrice: existingCouponApplication.finalPrice,
            });
        }

        // Calculate the discount and final price
        const discountAmount = (totalPrice * coupon.discountPercentage) / 100;
        const finalPrice = totalPrice - discountAmount;

        // Store coupon usage (apply the latest coupon)
        await CouponApplication.create({ userId, couponCode, finalPrice, status: 'applied' });

        // Delete all previous coupon codes for the user except the latest one
        await CouponApplication.deleteMany({
            userId,
            couponCode: { $ne: couponCode } // Keep the latest one
        });

        // Respond with success
        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully.',
            discount: coupon.discountPercentage,
            finalPrice,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred while applying the coupon.', error: error.message });
    }
};
