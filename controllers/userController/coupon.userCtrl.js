const Coupon = require('../../models/adminModel/coupan.adminModel');
const CouponApplication = require('../../models/userModel/coupon.userModel');
const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');

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
        const { couponCode, planId } = req.body;
        const userId = req.user?._id;

        // Validate input
        if (!userId) return res.status(404).json({ success: false, message: 'User ID not found!' });

        // Fetch the coupon and subscription plan in parallel
        const [coupon, subscriptionPlan] = await Promise.all([
            Coupon.findOne({
                couponCode,
                status: 'Active',
                expirationDate: { $gt: Date.now() }
            }).lean().exec(),
            SubscriptionPlan.findById(planId).lean().exec()
        ]);

        // Validate coupon and subscription plan
        if (!coupon) return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
        if (!subscriptionPlan) return res.status(404).json({ success: false, message: 'Subscription plan not found!' });

        // Check if coupon is already applied
        const existingCoupon = await CouponApplication.findOne({ userId, couponCode }).lean().exec();
        if (existingCoupon) {
            return res.status(409).json({
                success: false,
                message: 'Coupon already applied!',
                discount: subscriptionPlan.discount,
                finalPrice: existingCoupon.finalPrice,
            });
        }

        // Calculate the discount and final price
        const discountAmount = (subscriptionPlan.price * subscriptionPlan.discount) / 100;
        const finalPrice = subscriptionPlan.price - discountAmount;

        // Apply coupon and remove older applications in one go
        await Promise.all([
            CouponApplication.create({ userId, couponCode, discount: subscriptionPlan.discount, finalPrice, status: 'applied' }),
            CouponApplication.deleteMany({ userId, couponCode: { $ne: couponCode } }) // Keep only the latest coupon applied
        ]);

        // Respond with success
        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully.',
            discount: subscriptionPlan.discount,
            finalPrice,
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while applying the coupon.', error: error.message });
    }
};

