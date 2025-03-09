const QRCode = require("qrcode");
const busboy = require("busboy");
const mongoose = require('mongoose');
const Coupon = require('../../models/adminModel/coupan.adminModel');
const CouponApplication = require('../../models/userModel/coupon.userModel');
const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');
const Transaction = require("../../models/userModel/trans.userModel");
const { uploadImageOnCloudinary } = require('../../utils/uploadUtil');

const SingleCategorySubscriptionModel = require('../../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../../models/userModel/allSubs.userModel');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');
const UPI_ID = "9005877929-3@ybl";
const NAME = "DigitalVle";

exports.subscribeToCategoryOrAll = async (req, res, next) => {
    const { categoryId, planId } = req.body;

    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'User ID not found!',
            });
        };

        // Fetch the subscription plan
        const subscriptionPlan = await SubscriptionPlan.findById(planId);
        if (!subscriptionPlan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found!',
            });
        };

        if (categoryId.toLowerCase() === 'allcombo' && !subscriptionPlan.isAllCategory) {
            return res.status(400).json({
                success: false,
                message: `You must select the All Access plan for all categories!`,
            });
        };

        // Check for existing subscriptions
        const [singleCategorySub, allCategorySub] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }).lean(),
            AllCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }).lean(),
        ]);

        // If either subscription exists, return a conflict message
        if (singleCategorySub || allCategorySub) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already taken!',
            });
        };

        // Initialize discount and total price
        let totalPrice = subscriptionPlan.price;
        let discount = 0;

        // Apply any valid coupon discount
        const couponApplication = await CouponApplication.findOne({ userId }).lean();
        if (couponApplication) {
            const appliedCoupon = await Coupon.findOne({ couponCode: couponApplication.couponCode });
            if (!appliedCoupon) {
                return res.status(404).json({
                    success: false,
                    message: 'Applied coupon not found!',
                })
            };
            discount = couponApplication?.discount || 0;
            totalPrice = couponApplication.finalPrice;
        };

        // Create new subscription model
        const newSubscription = categoryId.toLowerCase() === 'allcombo'
            ? new AllCategorySubscriptionModel({
                userId,
                categoryId,
                planId,
                planType: subscriptionPlan.planType,
                price: subscriptionPlan.price,
                discount,
                finalPrice: totalPrice,
            })
            : new SingleCategorySubscriptionModel({
                userId,
                categoryId,
                planId,
                planType: subscriptionPlan.planType,
                price: subscriptionPlan.price,
                discount,
                finalPrice: totalPrice,
            });
        await newSubscription.save();

        const upiString = `upi://pay?pa=${UPI_ID}&pn=${NAME}&am=${subscriptionPlan.price}&cu=INR`;
        const qrCode = await QRCode.toDataURL(upiString);

        // Clear node-cache
        clearCache("node-cache");

        // Response object
        res.status(201).json({
            success: true,
            message: `Successfully subscribed to ${categoryId.toLowerCase() === 'allcombo' ?
                'all categories' : 'the selected category'}.`,
            ...newSubscription.toObject(),
            qrCode,
            UPI_ID,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateSubscriptionStatus = async (req, res, next) => {
    try {
        const { paymentStatus = 'completed', categoryId, planId } = req.body;
        const userId = req.user._id;

        const subscriptionPlan = await SubscriptionPlan.findById(planId);
        if (!subscriptionPlan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found!',
            });
        };

        if (categoryId.toLowerCase() === 'allcombo' && !subscriptionPlan.isAllCategory) {
            return res.status(400).json({
                success: false,
                message: `You must select the All Access plan for update the paymentStatus!`,
            });
        };

        // Determine which subscription to query based on categoryId
        let subscriptionPromise;
        if (categoryId.toLowerCase() === 'allcombo') {
            subscriptionPromise = AllCategorySubscriptionModel.findOne({ userId, categoryId, planId });
        } else {
            subscriptionPromise = SingleCategorySubscriptionModel.findOne({ userId, categoryId, planId });
        };

        // Wait for the selected subscription to be fetched
        const subscription = await subscriptionPromise;
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found!',
            });
        };

        // Check if payment status is already completed
        if (subscription.paymentStatus === "completed") {
            return res.status(409).json({
                success: false,
                message: 'Subscription already updated!',
                subscription,
            });
        };

        // Update subscription payment status
        subscription.paymentStatus = paymentStatus;
        await subscription.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Subscription status updated successfully.',
            subscription,
        });
    } catch (error) {
        next(error);
    }
};

exports.mySubscription = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Fetch single and all category subscriptions in parallel
        const [singleCategorySubscription, allCategorySubscription] = await Promise.all([
            SingleCategorySubscriptionModel.find({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }, { __v: 0, updatedAt: 0 }).lean(),
            AllCategorySubscriptionModel.find({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }, { __v: 0, updatedAt: 0 }).lean()
        ]);

        // If no subscriptions are found, return early
        if (!singleCategorySubscription.length && !allCategorySubscription.length) {
            return res.status(404).json({
                success: false,
                message: 'No subscriptions found for this user.',
            });
        };

        // Prepare subscription data
        const subscriptionData = {
            singleCategorySubscription,
            allCategorySubscription,
        };

        // Send the response
        res.status(200).json({
            success: true,
            message: 'Subscriptions fetched successfully!',
            subscription: subscriptionData,
        });
    } catch (error) {
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID not found" });
        }

        // Fetch both single & all category subscriptions in parallel
        const [singleSubscriptions, allSubscriptions, transactions] = await Promise.all([
            SingleCategorySubscriptionModel.find(
                { userId, paymentStatus: { $in: ["completed", "failed"] } },
                { __v: 0, updatedAt: 0 }
            ).lean(),
            AllCategorySubscriptionModel.find(
                { userId, paymentStatus: { $in: ["completed", "failed"] } },
                { __v: 0, updatedAt: 0 }
            ).lean(),
            Transaction.find(
                { userId },
                { subscriptionId: 1, fileUrl: 1, createdAt: 1, _id: 0 }
            ).lean(),
        ]);

        // Create a Map for transactions (subscriptionId -> transaction details)
        const transactionMap = new Map();
        transactions.forEach(tx => {
            transactionMap.set(tx.subscriptionId.toString(), { fileUrl: tx.fileUrl, createdAt: tx.createdAt });
        });

        // Merge transaction details into corresponding subscriptions
        const mergedSubscriptions = [...singleSubscriptions, ...allSubscriptions].map(subscription => {
            const transaction = transactionMap.get(subscription._id.toString()) || {};
            return { ...subscription, ...transaction };
        });

        // Check if history is empty
        if (mergedSubscriptions.length === 0) {
            return res.status(404).json({ success: false, message: "History not found!" });
        }

        // Return the merged result
        res.status(200).json({
            success: true,
            message: "History fetched successfully",
            history: mergedSubscriptions,
        });
    } catch (error) {
        next(error);
    }
};

exports.getSingleHistory = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID not found" });
        }

        // Fetch history using $or to reduce queries
        const history = await SingleCategorySubscriptionModel.findOne(
            { _id: subscriptionId, userId },
            { updatedAt: 0, __v: 0 }
        ).lean() ||
            await AllCategorySubscriptionModel.findOne(
                { _id: subscriptionId, userId },
                { updatedAt: 0, __v: 0 }
            ).lean();

        // Fetch transaction details separately
        const transaction = await Transaction.findOne(
            { userId, subscriptionId },
            { fileUrl: 1, _id: 0 }
        ).lean();

        if (!history && !transaction) {
            return res.status(404).json({ success: false, message: "No history found!" });
        }

        // Merge history and transaction data
        res.status(200).json({
            success: true,
            message: "History fetched successfully.",
            history: { ...history, ...(transaction || {}) },
        });
    } catch (error) {
        next(error);
    }
};

exports.uploadScreenshot = (req, res, next) => {
    const bb = busboy({ headers: req.headers });
    let userId, subscriptionId, hasFile = false;

    bb.on("field", (name, value) => {
        if (["userId", "subscriptionId"].includes(name)) {
            if (!mongoose.Types.ObjectId.isValid(value))
                return res.status(400).json({ success: false, message: `Invalid ${name}` });

            if (name === "userId") userId = value;
            else subscriptionId = value;
        }
    });

    bb.on("file", async (_, file, { mimeType }) => {
        hasFile = true;
        if (!mimeType.startsWith("image/"))
            return res.status(400).json({ success: false, message: "Only image files are allowed" });

        try {
            // ✅ **Check if transaction already exists**
            const existingTransaction = await Transaction.findOne({ userId, subscriptionId });

            if (existingTransaction) {
                return res.status(409).json({
                    success: false,
                    message: "Screenshot already uploaded for this subscription"
                });
            };

            // ✅ **Upload the file**
            const result = await uploadImageOnCloudinary(file, "screenshots");

            // ✅ **Create a new transaction**
            const transaction = await Transaction.create({
                userId,
                subscriptionId,
                fileUrl: result.secure_url,
                publicId: result.public_id
            });

            res.status(201).json({
                success: true,
                message: "Screenshot uploaded successfully",
                data: transaction
            });
        } catch (error) {
            next(error);
        }
    });

    bb.on("finish", () => {
        if (!hasFile) {
            return res.status(400).json({ success: false, message: "File is required" });
        }
    });

    req.pipe(bb);
};
