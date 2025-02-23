const Razorpay = require('razorpay');
const crypto = require('node:crypto');
const QRCode = require("qrcode");
const Transaction = require("../../models/userModel/trans.userModel");

// Replace with your UPI ID
const UPI_ID = "bhumeshkewat10@okaxis";
const AMOUNT = 100; // Replace with your amount

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

// Upi Qr payment
exports.generateUPIQRcode = async (req, res, next) => {
    try {
        const upiString = `upi://pay?pa=${UPI_ID}&pn=Bhumesh&am=${AMOUNT}&cu=INR`;
        const qrCode = await QRCode.toDataURL(upiString);
        // res.send(`<img src="${qrCode}" alt="UPI QR Code" />`);
        res.status(200).json({
            success: true,
            message: "QrCode generated successfully...!",
            data: {
                upiId: UPI_ID,
                qrCode
            },
        });
    } catch (error) {
        next(error);
    }
};

// 🔹 Save Transaction After Successful Payment
exports.saveTransaction = async (req, res, next) => {
    try {
        const { transactionId, userId, amount, currency, paymentMethod, status } = req.body;

        const transaction = new Transaction({
            transactionId,
            userId,
            amount,
            currency,
            paymentMethod,
            status
        });

        await transaction.save();
        res.status(201).json({ success: true, message: "Transaction saved!", data: transaction });

    } catch (error) {
        next(error);
    }
};

// 🔹 Fetch All Transactions
exports.getTransactions = async (req, res, next) => {
    try {
        const transactions = await Transaction.find().populate("userId", "name email").lean();
        res.status(200).json({
            success: true,
            message: "Transaction fetched successfully...",
            data: transactions
        });

    } catch (error) {
        next(error);
    }
};
