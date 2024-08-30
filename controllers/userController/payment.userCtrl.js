const UserPayment = require('../../models/userModel/payment.userModel');
const categoryModel = require('../../models/adminModel/category.adminModel');

exports.CreatePayment = async (req, res) => {
    try {
        const { category, subscriptionType, plan, price } = req.body;

        const userId = req.user._id;

        if (!userId || !category || !subscriptionType || (subscriptionType === 'subscription' && !plan) || !price) {
            return res.status(400).json({
                success: false,
                message: 'userId, category, subscriptionType, price, and plan (if subscription) are required.'
            });
        };

        let expiryDate;
        if (subscriptionType === 'subscription') {
            const currentDate = new Date();
            switch (plan) {
                case 'monthly':
                    expiryDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
                    break;
                case 'quarterly':
                    expiryDate = new Date(currentDate.setMonth(currentDate.getMonth() + 3));
                    break;
                case 'yearly':
                    expiryDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid subscription plan provided.'
                    });
            };
        };

        const Category = await categoryModel.findOne({ name: category }, { category: 1, _id: 0 });
        if (!Category) {
            return res.status(404).json({
                success: true,
                message: 'Category not found',
            });
        };

        const payment = new UserPayment({
            userId: userId._id.toString(),
            category,
            subscriptionType,
            plan,
            price,
            expiryDate,
        });
        await payment.save();

        res.status(201).json({
            success: true,
            message: "Payment successfull...",
            payment,
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };
        if (error.code = 11000) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already taken.',
            });
        };
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Error occured while creating the payment",
        });
    };
};

exports.getAllPayments = async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({
                success: true,
                message: "userId not found",
            });
        };

        const payments = await UserPayment.find({ userId }, { __v: 0 });
        if (payments.length === 0) {
            return res.status(404).json({
                success: true,
                message: "Payments not found!"
            });
        };
        res.status(200).json({
            success: true,
            message: "payments fetched successfully...",
            payments,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Error occured while fetching the payment",
        });
    };
};

exports.getSinglePayment = async (req, res) => {
    try {
        const { paymentId } = req.query || req.body ;

        const payment = await UserPayment.findById(paymentId);

        if (payment === null || payment.length === 0) {
            return res.status(404).json({
                success: false,
                message: "payment not found!",
            });
        };
        res.status(200).json({
            success: true,
            message: "payment fetched successfully...",
            payment,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Error occured while fetching the payment",
        });
    };
};