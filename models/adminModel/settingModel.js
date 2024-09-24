const mongoose = require('mongoose');

// ****************** General settings schema ********************
const generalSettingsSchema = new mongoose.Schema({
    siteName: {
        type: String,
        required: [true, 'Site name is required'],
        trim: true,
        minlength: [3, 'Site name must be at least 3 characters long'],
        maxlength: [100, 'Site name must be less than 100 characters long'],
    },
    siteLogo: {
        public_id: {
            type: String,
            required: [true, 'Site logo public ID is required'],
        },
        url: {
            type: String,
            required: [true, 'Site logo URL is required'],
            validate: {
                validator: function (v) {
                    return /^https?:\/\/.+/i.test(v); // Validate URL format
                },
                message: 'Site logo must be a valid URL',
            },
        },
    },
    siteKeywords: {
        type: String,
        trim: true,
        maxlength: [255, 'Keywords must be less than 255 characters long'],
    },
    siteFavicon: {
        public_id: {
            type: String,
            required: [true, 'Site favicon public ID is required'],
        },
        url: {
            type: String,
            required: [true, 'Site favicon URL is required'],
            validate: {
                validator: function (v) {
                    return /^https?:\/\/.+/i.test(v); // Validate URL format
                },
                message: 'Site favicon must be a valid URL',
            },
        },
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/.+\@.+\..+/, 'Please enter a valid email address'],
    },
    _description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description must be less than 500 characters long'],
    },
    headerCode: {
        type: String,
        trim: true,
    },
    footerCode: {
        type: String,
        trim: true,
    },
    copyrightText: {
        type: String,
        trim: true,
        maxlength: [100, 'Copyright text must be less than 100 characters long'],
    },
    socialMediaLinks: {
        facebook: {
            type: String,
            trim: true,
            validate: {
                validator: function (v) {
                    return v === '' || /^https?:\/\/.+/i.test(v); // Validate URL or allow empty
                },
                message: 'Facebook URL must be a valid URL or empty',
            },
        },
        twitter: {
            type: String,
            trim: true,
            validate: {
                validator: function (v) {
                    return v === '' || /^https?:\/\/.+/i.test(v); // Validate URL or allow empty
                },
                message: 'Twitter URL must be a valid URL or empty',
            },
        },
        instagram: {
            type: String,
            trim: true,
            validate: {
                validator: function (v) {
                    return v === '' || /^https?:\/\/.+/i.test(v); // Validate URL or allow empty
                },
                message: 'Instagram URL must be a valid URL or empty',
            },
        },
    },
    appDownloadLinks: {
        googlePlay: {
            type: String,
            trim: true,
            validate: {
                validator: function (v) {
                    return v === '' || /^https?:\/\/.+/i.test(v); // Validate URL or allow empty
                },
                message: 'Google Play URL must be a valid URL or empty',
            },
        },
        appStore: {
            type: String,
            trim: true,
            validate: {
                validator: function (v) {
                    return v === '' || /^https?:\/\/.+/i.test(v); // Validate URL or allow empty
                },
                message: 'App Store URL must be a valid URL or empty',
            },
        },
    },
}, { timestamps: true });

// ***************** SMTP setting schema ********************

const smtpEmailSettingsSchema = new mongoose.Schema({
    smtpHost: {
        type: String,
        required: [true, 'SMTP Host is required.'],
    },
    smtpPort: {
        type: Number,
        required: [true, 'SMTP Port is required.'],
        min: [1, 'Port must be a positive number.'],
        max: [65535, 'Port must be less than 65536.'], // Valid range for TCP ports
    },
    smtpEmail: {
        type: String,
        required: [true, 'SMTP Email is required.'],
        match: [/.+@.+\..+/, 'Please enter a valid email address.'], // Basic email format validation
    },
    smtpPassword: {
        type: String,
        required: [true, 'SMTP Password is required.'],
    },
    encryptionType: {
        type: String,
        required: [true, 'Encryption Type is required.'],
        enum: {
            values: ['SSL', 'TLS', 'NONE'],
            message: 'Encryption Type must be either SSL, TLS, or NONE.'
        },
    },
}, { timestamps: true });

// ******************* social media shcema *******************

const socialMediaSettingsSchema = new mongoose.Schema({
    googleLogin: {
        type: Boolean,
        default: false,
    },
    googleClientId: {
        type: String,
        required: function () { return this.googleLogin; },
    },
    googleSecret: {
        type: String,
        required: function () { return this.googleLogin; },
    },
    facebookLogin: {
        type: Boolean,
        default: false,
    },
    facebookAppId: {
        type: String,
        required: function () { return this.facebookLogin; },
    },
    facebookClientSecret: {
        type: String,
        required: function () { return this.facebookLogin; },
    },
}, { timestamps: true });

// *******************  menu setting schema *******************

const menuSettingsSchema = new mongoose.Schema({
    story: {
        type: Boolean,
        default: true,
    },
    article: {
        type: Boolean,
        default: true,
    },
    video__: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

// ****************** reCAPTCHA setting schema ******************

const recaptchaSettingsSchema = new mongoose.Schema({
    siteKey: {
        type: String,
        required: true,
    },
    secretKey: {
        type: String,
        required: true,
    },
    enableOnLogin: {
        type: Boolean,
        default: false,
    },
    enableOnSignup: {
        type: Boolean,
        default: false,
    },
    enableOnForgotPassword: {
        type: Boolean,
        default: false,
    },
    enableOnContactUs: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// ****************** website banner-ads settings *******************

const bannerAdsSettingsSchema = new mongoose.Schema({
    homeTop: {
        type: String,
        required: true,
    },
    listTop: {
        type: String,
        required: true,
    },
    detailsTop: {
        type: String,
        required: true,
    },
    otherPagesTop: {
        type: String,
        required: true,
    },
    homeBottom: {
        type: String,
        required: true,
    },
    listBottom: {
        type: String,
        required: true,
    },
    detailsBottom: {
        type: String,
        required: true,
    },
    otherPagesBottom: {
        type: String,
        required: true,
    },
}, { timestamps: true });

// ****************** site mentainence setting *******************

const maintenanceModeSettingsSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: false,
    },
    message: {
        type: String,
        required: true,
    },
}, { timestamps: true });


// model
const GeneralSettings = mongoose.model('GeneralSettings', generalSettingsSchema);
const SmtpEmailSettings = mongoose.model('SmtpEmailSettings', smtpEmailSettingsSchema);
const SocialMediaSettings = mongoose.model('SocialMediaSettings', socialMediaSettingsSchema);
const MenuSettings = mongoose.model('MenuSettings', menuSettingsSchema);
const RecaptchaSettings = mongoose.model('RecaptchaSettings', recaptchaSettingsSchema);
const BannerAdsSettings = mongoose.model('BannerAdsSettings', bannerAdsSettingsSchema);
const MaintenanceModeSettings = mongoose.model('MaintenanceModeSettings', maintenanceModeSettingsSchema);

module.exports = {
    GeneralSettings,
    SmtpEmailSettings,
    SocialMediaSettings,
    MenuSettings,
    RecaptchaSettings,
    BannerAdsSettings,
    MaintenanceModeSettings,
};
