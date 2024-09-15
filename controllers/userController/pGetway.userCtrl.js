const Razorpay = require('razorpay');
const crypto = require('crypto'); 

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

// razorpay payment getway

exports.createOrder = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        const receipt = `receipt_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;

        const options = {
            amount: amount * 100, // Amount is in smallest currency unit, so convert to paise
            currency,
            receipt, 
            payment_capture: 1, // Automatically capture payment after order is created
        };

        const order = await razorpay.orders.create(options);     

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    };
};

exports.verifyPayment = (req, res) => {
    try {
        const { order_id, payment_id, signature } = req.body;

        if (!order_id || !payment_id || !signature) {
            return res.status(400).json({
                success: true,
                message: "amount, currency and signiture are required",
            });
        };
        const generated_signature = razorpay.utils.sha256(
            order_id + '|' + payment_id,
            razorpay.key_secret
        );

        if (generated_signature === signature) {
            res.json({
                success: true,
                message: 'Payment verified successfully',
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid payment signature',
            });
        };
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: true,
            message: "error occured while verifying the payment",
        });
    };
};

// stripe payment getway
