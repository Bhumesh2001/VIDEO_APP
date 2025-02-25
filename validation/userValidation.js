const { body, validationResult } = require('express-validator');

// ****************** user validation ******************
exports.validateUser = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required.')
        .isLength({ max: 50 }).withMessage('Name must be at most 50 characters long.'),

    body('email')
        .notEmpty().withMessage('Email is required.')
        .trim()
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    body('password')
        .trim()
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-])[\S]{8,}$/)
        .withMessage('Password must be strong!'),

    body('mobileNumber')
        .optional()
        .trim()
        .isMobilePhone('any').withMessage('Invalid mobile number.'),
];

// ************* login validation *************
exports.validateLoginUser = [
    body('email')
        .notEmpty().withMessage('Email is required.')
        .trim()
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
];

// ************* verify user validation *************
exports.validatEmailAndCode = [
    body('email')
        .notEmpty().withMessage('Email is required.')
        .trim()
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    body('code')
        .notEmpty().withMessage('Code is required.')
        .isNumeric().withMessage('Code must be a numeric value.')
        .isLength({ min: 6, max: 6 }).withMessage('Code must be exactly 6 digits.')
];

// ************* forgot password validation ****************
exports.validateEmail = [
    body('email')
        .notEmpty().withMessage('Email is required.')
        .trim()
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),
];

// **************** validate new email and password ****************
exports.validateEmailAndNewPassword = [
    body('email')
        .notEmpty().withMessage('Email is required.')
        .trim()
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    body('newPassword')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .isStrongPassword({
            minLength: 12,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        }).withMessage('Password must be strong!'),
];

// ************* Register with email or phone validation *************
exports.validateRegisterWithEmailOrPhone = [
    body('email')
        .optional({ checkFalsy: true })
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    body('mobileNumber')
        .optional({ checkFalsy: true })
        .isMobilePhone().withMessage('Invalid mobile number.')
        .isLength({ min: 10, max: 15 })
        .withMessage('Mobile number must be between 10 and 15 digits long.'),

    // Ensure that either email or mobileNumber is provided
    body().custom((value) => {
        if (!value.email && !value.mobileNumber) {
            throw new Error('Either email or mobile number is required.');
        }
        return true;
    })
];

// ************** validate phone number ****************
exports.validatePhoneNumber = [
    body('mobileNumber')
        .notEmpty().withMessage('Mobile number is required!')
        .trim()
        .isMobilePhone('any').withMessage('Invalid mobile number.'),
];

// ************* validate email and OTP *************
exports.validateEmailAndOTP = [
    body('email')
        .notEmpty().withMessage('Email is required.')
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    body('otp')
        .isNumeric().withMessage('OTP must be a numeric value.')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.')
        .notEmpty().withMessage('OTP is required.')
];

// **************** contact us validation ******************
exports.validateContactData = [
    body('name')
        .notEmpty().withMessage('Name is required.')
        .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters long.')
        .trim(),

    body('email')
        .notEmpty().withMessage('Email is required.')
        .isEmail().withMessage('Please provide a valid email address.')
        .normalizeEmail(),

    body('phone')
        .notEmpty().withMessage('Phone number is required.')
        .isMobilePhone('any').withMessage('Please provide a valid phone number.')
        .trim(),

    body('city')
        .notEmpty().withMessage('City is required.')
        .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters long.')
        .trim(),

    body('district')
        .notEmpty().withMessage('District is required.')
        .trim(),

    body('state')
        .notEmpty().withMessage('State is required.')
        .trim(),

    body('country')
        .notEmpty().withMessage('Country is required.')
        .trim(),

    body('pincode')
        .notEmpty().withMessage('Pincode is required.')
        .isPostalCode('any').withMessage('Please provide a valid pincode.'),

    body('message')
        .optional()
        .isLength({ min: 10, max: 500 }).withMessage('Message must be between 10 and 500 characters long.')
        .trim(),
];

// *************** coupon validation ****************
exports.validateCouponData = [
    body('couponCode')
        .notEmpty().withMessage('Coupon code is required.')
        .trim(),

    // Validate planId as a MongoDB ObjectId
    body('planId')
        .notEmpty().withMessage('Plan ID is required.')
        .isMongoId().withMessage('Invalid Plan ID.'),
];

// ************** validate subescription data **************
exports.validateCategoryAndPlan = [
    body('categoryId')
        .notEmpty().withMessage('Category ID is required.')
        .isMongoId().withMessage('Invalid Category ID. Must be a valid MongoDB ObjectId.'),

    body('planId')
        .notEmpty().withMessage('Plan ID is required.')
        .isMongoId().withMessage('Invalid Plan ID. Must be a valid MongoDB ObjectId.'),
];

// *************** validate update subscription data ****************
exports.validateCategoryPlanPayment = [
    body('categoryId')
        .notEmpty().withMessage('Category ID is required.')
        .isMongoId().withMessage('Invalid Category ID. Must be a valid MongoDB ObjectId.'),

    body('planId')
        .notEmpty().withMessage('Plan ID is required.')
        .isMongoId().withMessage('Invalid Plan ID. Must be a valid MongoDB ObjectId.'),

    body('paymentStatus')
        .notEmpty().withMessage('Payment status is required.')
        .isIn(['pending', 'completed', 'failed'])
        .withMessage('Payment status must be one of: pending, completed, or failed.'),
];

// ********************  Article validation **********************
exports.validateArticle = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ min: 10, max: 200 })
        .withMessage("Title must be between 10 and 200 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ min: 50, max: 5000 })
        .withMessage("Description must be between 50 and 5000 characters"),

    body("image")
        .custom((value, { req }) => {
            const uploadedFile = req.file;

            if (!uploadedFile) {
                throw new Error("Image is required");
            }

            if (req.file.size > 2 * 1024 * 1024) { // 2MB limit
                throw new Error("Image must be 2MB or less!");
            }

            // If file is uploaded
            if (uploadedFile) {
                const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
                if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
                    throw new Error("Uploaded file must be an image (jpg, png, gif, webp)");
                }
            }

            return true;
        }),
];

// ********************  story validation  **********************
exports.validateStory = [
    // Validate title
    body('title')
        .notEmpty().withMessage('Title is required')
        .isString().withMessage('Title must be a string')
        .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),

    // Validate caption (optional, max length 500)
    body('caption')
        .optional()
        .isString().withMessage('Caption must be a string')
        .isLength({ max: 500 }).withMessage('Caption must not exceed 500 characters'),
];
