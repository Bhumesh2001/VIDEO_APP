const Coupon = require('../../models/adminModel/coupan.adminModel');

exports.getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findOne({});
        if(!coupon){
            return res.status(404).json({
                success: false,
                message: 'coupon not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'coupon fetched successfully...',
            coupon,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: true,
            message: 'error occured while fetching the coupon',
        });   
    };
};