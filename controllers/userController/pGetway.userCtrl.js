const Razorpay = require('razorpay');
const crypto = require('node:crypto'); 

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

// razorpay payment getway

exports.createOrder = async (req, res, next) => {
    try {
        const { amount, currency } = req.body;

        const receipt = `receipt_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;

        const options = {
            amount: amount * 100,
            currency,
            receipt, 
            payment_capture: 1, 
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
        next(error);
    };
};

exports.verifyPayment = (req, res, next) => {
    try {
        const { order_id, payment_id, signature } = req.body;
        
        const generated_signature = razorpay.utils.sha256(
            order_id + '|' + payment_id,
            razorpay.key_secret
        );

        if (generated_signature === signature) {
            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentGetway: 'Razorpay',
                payment_id,
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid payment signature',
            });
        };
    } catch (error) {
       next(error);
    };
};

// stripe payment getway
