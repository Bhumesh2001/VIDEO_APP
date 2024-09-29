const Coupon = require('../../models/adminModel/coupan.adminModel');

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

exports.checkCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;

        const coupon = await Coupon.findOne({
            couponCode,
            status: 'Active',
            expirationDate: { $gt: Date.now() }
        }).lean().exec();

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired coupon'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon is valid',
            coupon
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
