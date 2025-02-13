const mongoose = require('mongoose');

// ****************** General settings schema ********************
const generalSettingsSchema = new mongoose.Schema({
    siteName: {
        type: String,
        trim: true,
        required: true,
    },
    siteLogo: {
        public_id: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
    },
    siteKeywords: {
        type: String,
        trim: true,
    },
    siteFavicon: {
        public_id: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    _description: {
        type: String,
        trim: true,
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
    },
    socialMediaLinks: {
        facebook: {
            type: String,
            trim: true,
        },
        twitter: {
            type: String,
            trim: true,
        },
        instagram: {
            type: String,
            trim: true,
        },
    },
    appDownloadLinks: {
        googlePlay: {
            type: String,
            trim: true,
        },
        appStore: {
            type: String,
            trim: true,
        },
    },
}, { timestamps: true });

// ***************** SMTP setting schema ********************

const smtpEmailSettingsSchema = new mongoose.Schema({
    smtpHost: {
        type: String,
        required: true,
    },
    smtpPort: {
        type: Number,
        required: true,
    },
    smtpEmail: {
        type: String,
        required: true,
    },
    smtpPassword: {
        type: String,
        required: true,
    },
    encryptionType: {
        type: String,
        required: true,
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
