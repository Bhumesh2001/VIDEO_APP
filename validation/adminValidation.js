const { body } = require("express-validator");
const Video = require('../models/adminModel/video.adminModel')
const Category = require('../models/adminModel/category.adminModel');
const Article = require("../models/adminModel/article.adminModel");

// ********************  admin validation  **********************
exports.adminValidationRules = [
    body("username")
        .trim()
        .isLength({ min: 4, max: 20 })
        .withMessage("Username must be between 4 and 20 characters")
        .notEmpty()
        .withMessage("Username is required"),

    body("email")
        .trim()
        .isEmail()
        .notEmpty()
        .withMessage('Email is required')
        .withMessage("Please enter a valid email address")
        .normalizeEmail(),

    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .notEmpty()
        .withMessage('Password is required')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
        .withMessage('Password must be strong!'),
];

// ******************** admin login validation  **********************
exports.adminLoginValidationRules = [
    body("email")
        .notEmpty()
        .withMessage('Email is required')
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email address")
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
];

// ****************** update profile validation ********************
exports.validateUpdateAdminData = [
    // Username Validation
    body("username")
        .optional()
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage("Username must be 3-20 characters long"),

    // Email Validation
    body("email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Invalid email format"),

    // Phone Validation (Supports International Numbers)
    body("phone")
        .optional()
        .trim()
        .isMobilePhone()
        .withMessage("Invalid phone number"),

    body("profilePicture")
        .optional()
        .custom((value, { req }) => {
            if (req.file) { // If a file is uploaded, validate it
                if (req.file.size > 500 * 1024) {
                    throw new Error("Profile picture must be 500KB or less!");
                }

                const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
                if (!allowedMimeTypes.includes(req.file.mimetype)) {
                    throw new Error("Profile picture must be a JPG, PNG, or WEBP image!");
                }
            }

            return true; // If no file is uploaded, validation passes
        }),
];

// ********************  article validation **********************
exports.articleValidationRules = [
    body("title")
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ min: 10, max: 200 })
        .withMessage("Title must be between 10 and 200 characters")
        .trim()
        .custom(async (value) => {
            const articleExists = await Article.findOne({ title: value }).lean().exec();
            if (articleExists) {
                throw new Error('Article already exist!');
            }
            return true;
        }),

    body("description")
        .optional()
        .trim(),

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

// ********************  banner validation  **********************
exports.bannerValidationRules = [
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

    body("status")
        .optional()
        .isIn(["Active", "Inactive"])
        .withMessage("Status must be either 'Active' or 'Inactive'"),
];

// ******************** category validation  **********************
exports.categoryValidationRules = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Category name is required")
        .isLength({ min: 3, max: 50 })
        .withMessage("Category name must be between 3 and 50 characters"),

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

// ********************  coupon validation  **********************
exports.couponValidationRules = [
    body("coupon_Code")
        .trim()
        .notEmpty()
        .withMessage("Coupon code is required.")
        .isLength({ min: 5, max: 20 })
        .withMessage("Coupon code must be between 5 and 20 characters.")
        .matches(/^[A-Z0-9]+$/)
        .withMessage("Coupon code must contain only uppercase letters and numbers."),

    body("expirationDate")
        .notEmpty()
        .withMessage("Expiration date is required.")
        .withMessage("Expiration date must be a valid date.")
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error("Expiration date must be in the future.");
            }
            return true;
        }),

    body("maxUsage")
        .notEmpty()
        .withMessage("Maximum usage is required.")
        .isInt({ min: 1 })
        .withMessage("Maximum usage must be at least 1."),
];

// ********************  story validation  **********************
exports.storyValidationRules = [
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

    body('image')
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

// ******************** subcsription validation  **********************
exports.subscriptionPlanValidationRules = [
    // Validate planName
    body('planName')
        .notEmpty().withMessage('Plan name is required')
        .isString().withMessage('Plan name must be a string')
        .isLength({ min: 3 }).withMessage('Plan name must be at least 3 characters long'),

    // Validate planType
    body('planType')
        .notEmpty().withMessage('Plan type is required')
        .isIn(['monthly', 'quarterly', 'yearly', 'lifetime'])
        .withMessage('Plan type must be one of: monthly, quarterly, yearly, lifetime'),

    // Validate price
    body('price')
        .notEmpty().withMessage('Price is required')
        .isNumeric().withMessage('Price must be a number')
        .isInt({ min: 0 }).withMessage('Price cannot be less than 0')
        .custom(value => value % 1 === 0).withMessage('Price must be a whole number'),

    // Validate discount
    body('discount')
        .notEmpty().withMessage('Discount is required')
        .isNumeric().withMessage('Discount must be a number')
        .isInt({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100')
        .custom(value => value % 1 === 0).withMessage('Discount must be a whole number'),

    body('features')
        .custom(features => features.length > 0).withMessage('At least one feature is required')
];

// ********************  vidoe validation  **********************
exports.videoValidationRules = [
    // Validate title
    body('title')
        .notEmpty().withMessage('Title is required')
        .isString().withMessage('Title must be a string')
        .isLength({ min: 5 }).withMessage('Title must be at least 5 characters long')
        .trim(),

    // Validate description
    body('description')
        .optional()
        .isString().withMessage('Description must be a string')
        .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long')
        .trim(),

    // Validate category (Check if it exists in DB)
    body('category')
        .notEmpty().withMessage('Category is required')
        .isString().withMessage('Category must be a string')
        .custom(async (value) => {
            const categoryExists = await Category.findById(value).lean().exec();
            if (!categoryExists) {
                throw new Error('Category does not exist');
            }
            return true;
        }),

    // Validate thumbnail (either URL or file is required)
    body('thumbnail')
        .notEmpty().withMessage('Thumbnail is required')
        .custom((value, { req }) => {
            if (req.files?.thumbnail) {
                // Check if file uploaded is a valid image
                const file = req.files.thumbnail[0];
                const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
                if (!validImageTypes.includes(file.mimetype)) {
                    throw new Error('Thumbnail must be a valid image file (JPEG, PNG, GIF)');
                }
            } else if (!value || !/^https?:\/\/.+/.test(value)) {
                throw new Error('Thumbnail must be a valid URL or a file upload');
            }
            return true;
        }),

    // Validate video (either URL or file is required) and check if it already exists
    body('video')
        .notEmpty().withMessage('Video is required')
        .custom(async (value, { req }) => {
            if (req.files?.video) {
                // Check if file uploaded is a valid video
                const file = req.files.video[0];
                const validVideoTypes = ['video/mp4', 'video/avi', 'video/mkv'];
                if (!validVideoTypes.includes(file.mimetype)) {
                    throw new Error('Video must be a valid video file (MP4, AVI, MKV)');
                }
            } else if (!value || !/^(ftp|http|https):\/\/[^ "]+$/.test(value)) {
                throw new Error('Video must be a valid URL or a file upload');
            }

            // Check if the video already exists (by URL)
            if (!req.files?.video) {
                const videoExists = await Video.findOne({ videoUrl: value }).lean().exec();
                if (videoExists) {
                    throw new Error('This video already exists');
                }
            }
            return true;
        }),
];

// ****************** General settings validation ********************
exports.validateGeneralSettings = [
    body('siteName')
        .isString()
        .withMessage('Site name must be a string.')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Site name must be between 3 and 100 characters long.')
        .notEmpty()
        .withMessage('Site name is required.'),

    body('siteLogo')
        .optional(),

    body('siteKeywords')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Keywords must be less than 255 characters long.'),

    body('siteFavicon')
        .optional(),

    body('email')
        .isEmail()
        .withMessage('Please enter a valid email address.')
        .normalizeEmail()
        .notEmpty()
        .withMessage('Email is required.'),

    body('description')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters long.'),

    body('headerCode')
        .optional()
        .isString()
        .trim(),

    body('footerCode')
        .optional()
        .isString()
        .trim(),

    body('copyrightText')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Copyright text must be less than 100 characters long.'),

    body('facebook')
        .optional()
        .isURL()
        .withMessage('Facebook URL must be a valid URL or empty.')
        .isLength({ max: 255 })
        .withMessage('Facebook URL must be less than 255 characters long.'),

    body('twitter')
        .optional()
        .isURL()
        .withMessage('Twitter URL must be a valid URL or empty.')
        .isLength({ max: 255 })
        .withMessage('Twitter URL must be less than 255 characters long.'),

    body('instagram')
        .optional()
        .isURL()
        .withMessage('Instagram URL must be a valid URL or empty.')
        .isLength({ max: 255 })
        .withMessage('Instagram URL must be less than 255 characters long.'),

    body('googlePlay')
        .optional()
        .isURL()
        .withMessage('Google Play URL must be a valid URL or empty.'),

    body('appStore')
        .optional()
        .isURL()
        .withMessage('App Store URL must be a valid URL or empty.')
];

// ***************** SMTP setting validation ********************
exports.validateSmtpEmailSettings = [
    body('smtpHost')
        .isString()
        .withMessage('SMTP Host is required.')
        .notEmpty()
        .withMessage('SMTP Host is required.'),

    body('smtpPort')
        .isInt({ min: 1, max: 65535 })
        .withMessage('Port must be between 1 and 65535.')
        .notEmpty()
        .withMessage('SMTP Port is required.'),

    body('smtpEmail')
        .isEmail()
        .withMessage('Please enter a valid email address for SMTP.')
        .normalizeEmail()
        .notEmpty()
        .withMessage('SMTP Email is required.'),

    body('smtpPassword')
        .isString()
        .withMessage('SMTP Password is required.')
        .notEmpty()
        .withMessage('SMTP Password is required.'),

    body('encryptionType')
        .isIn(['SSL', 'TLS', 'NONE'])
        .withMessage('Encryption Type must be either SSL, TLS, or NONE.')
        .notEmpty()
        .withMessage('Encryption Type is required.')
];

// ******************* Social media login validation *******************
exports.validateSocialMediaSettings = [
    body('googleLogin')
        .isBoolean()
        .withMessage('Google login must be a boolean value.'),

    body('googleClientId')
        .optional()
        .isString()
        .withMessage('Google Client ID is required when Google login is enabled.')
        .notEmpty()
        .withMessage('Google Client ID is required when Google login is enabled.'),

    body('googleSecret')
        .optional()
        .isString()
        .withMessage('Google Secret is required when Google login is enabled.')
        .notEmpty()
        .withMessage('Google Secret is required when Google login is enabled.'),

    body('facebookLogin')
        .isBoolean()
        .withMessage('Facebook login must be a boolean value.'),

    body('facebookAppId')
        .optional()
        .isString()
        .withMessage('Facebook App ID is required when Facebook login is enabled.')
        .notEmpty()
        .withMessage('Facebook App ID is required when Facebook login is enabled.'),

    body('facebookClientSecret')
        .optional()
        .isString()
        .withMessage('Facebook Client Secret is required when Facebook login is enabled.')
        .notEmpty()
        .withMessage('Facebook Client Secret is required when Facebook login is enabled.')
];

// ******************* reCAPTCHA validation *******************
exports.validateRecaptchaSettings = [
    body('siteKey')
        .isString()
        .withMessage('reCAPTCHA Site Key is required.')
        .notEmpty()
        .withMessage('reCAPTCHA Site Key is required.'),

    body('secretKey')
        .isString()
        .withMessage('reCAPTCHA Secret Key is required.')
        .notEmpty()
        .withMessage('reCAPTCHA Secret Key is required.'),

    body('enableOnLogin')
        .isBoolean()
        .withMessage('Enable on login must be a boolean value.'),

    body('enableOnSignup')
        .isBoolean()
        .withMessage('Enable on signup must be a boolean value.'),

    body('enableOnForgotPassword')
        .isBoolean()
        .withMessage('Enable on forgot password must be a boolean value.'),

    body('enableOnContactUs')
        .isBoolean()
        .withMessage('Enable on contact us must be a boolean value.')
];

// ******************* Banner Ads settings validation *******************
exports.validateBannerAdsSettings = [
    body('homeTop')
        .isString()
        .withMessage('Home Top Banner Ad is required.')
        .notEmpty()
        .withMessage('Home Top Banner Ad is required.'),

    body('listTop')
        .isString()
        .withMessage('List Top Banner Ad is required.')
        .notEmpty()
        .withMessage('List Top Banner Ad is required.'),

    body('detailsTop')
        .isString()
        .withMessage('Details Top Banner Ad is required.')
        .notEmpty()
        .withMessage('Details Top Banner Ad is required.'),

    body('otherPagesTop')
        .isString()
        .withMessage('Other Pages Top Banner Ad is required.')
        .notEmpty()
        .withMessage('Other Pages Top Banner Ad is required.'),

    body('homeBottom')
        .isString()
        .withMessage('Home Bottom Banner Ad is required.')
        .notEmpty()
        .withMessage('Home Bottom Banner Ad is required.'),

    body('listBottom')
        .isString()
        .withMessage('List Bottom Banner Ad is required.')
        .notEmpty()
        .withMessage('List Bottom Banner Ad is required.'),

    body('detailsBottom')
        .isString()
        .withMessage('Details Bottom Banner Ad is required.')
        .notEmpty()
        .withMessage('Details Bottom Banner Ad is required.'),

    body('otherPagesBottom')
        .isString()
        .withMessage('Other Pages Bottom Banner Ad is required.')
        .notEmpty()
        .withMessage('Other Pages Bottom Banner Ad is required.')
];

// ******************* Maintenance Mode settings validation *******************
exports.validateMaintenanceModeSettings = [
    body('enabled')
        .isBoolean()
        .withMessage('Maintenance Mode enabled must be a boolean value.')
        .notEmpty()
        .withMessage('Maintenance Mode enabled is required.'),

    body('message')
        .isString()
        .withMessage('Maintenance Mode message is required.')
        .notEmpty()
        .withMessage('Maintenance Mode message is required.')
];

// ******************* Menu setting validation **********************
exports.validateMenuSettings = [
    body('story')
        .isBoolean()
        .withMessage('Story should be a boolean value.')
        .optional(),

    body('article')
        .isBoolean()
        .withMessage('Article should be a boolean value.')
        .optional(),

    body('video__')
        .isBoolean()
        .withMessage('Video should be a boolean value.')
        .optional(),
];
