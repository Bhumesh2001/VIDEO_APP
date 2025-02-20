const {
    GeneralSettings,
    SmtpEmailSettings,
    SocialMediaSettings,
    MenuSettings,
    RecaptchaSettings,
    BannerAdsSettings,
    MaintenanceModeSettings,
} = require('../../models/adminModel/settingModel');

const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

// ****************** General settings ******************

exports.saveGeneralSettings = async (req, res, next) => {
    try {
        const {
            siteName, siteKeywords, email, _description, headerCode, footerCode,
            copyrightText, facebook, twitter, instagram, googlePlay, appStore
        } = req.body;

        // Fetch existing settings (select only necessary fields)
        const existingSettings = await GeneralSettings.findOne()
            .select("siteLogo siteFavicon socialMediaLinks appDownloadLinks")
            .lean();

        // Extract uploaded files (if available)
        const logoFile = req.files?.siteLogo?.[0]?.path || null;
        const faviconFile = req.files?.siteFavicon?.[0]?.path || null;

        // Delete old images only if new ones are provided
        if (logoFile && existingSettings?.siteLogo?.public_id) {
            await deleteImageOnCloudinary(existingSettings.siteLogo.public_id);
        }
        if (faviconFile && existingSettings?.siteFavicon?.public_id) {
            await deleteImageOnCloudinary(existingSettings.siteFavicon.public_id);
        }

        // Upload new images (only if a file exists)
        const siteLogo = logoFile ? await uploadImageOnCloudinary(logoFile, "VleSiteLogos") : null;
        const siteFavicon = faviconFile ? await uploadImageOnCloudinary(faviconFile, "VleSiteFavicons") : null;

        // Prepare update data
        const settingsData = {
            siteName: siteName || existingSettings?.siteName,
            siteLogo: siteLogo ? { url: siteLogo.secure_url, public_id: siteLogo.public_id } :
                existingSettings?.siteLogo,
            siteFavicon: siteFavicon ? { url: siteFavicon.secure_url, public_id: siteFavicon.public_id } :
                existingSettings?.siteFavicon,
            siteKeywords: siteKeywords || existingSettings?.siteKeywords,
            email: email || existingSettings?.email,
            _description: _description || existingSettings?._description,
            headerCode: headerCode || existingSettings?.headerCode,
            footerCode: footerCode || existingSettings?.footerCode,
            copyrightText: copyrightText || existingSettings?.copyrightText,
            socialMediaLinks: {
                facebook: facebook || existingSettings?.socialMediaLinks?.facebook,
                twitter: twitter || existingSettings?.socialMediaLinks?.twitter,
                instagram: instagram || existingSettings?.socialMediaLinks?.instagram,
            },
            appDownloadLinks: {
                googlePlay: googlePlay || existingSettings?.appDownloadLinks?.googlePlay,
                appStore: appStore || existingSettings?.appDownloadLinks?.appStore,
            }
        };

        // Upsert the settings (create if it doesn't exist, otherwise update)
        const savedSettings = await GeneralSettings.findOneAndUpdate(
            {},
            settingsData,
            { new: true, upsert: true }
        );

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: "Settings updated successfully.",
            settings: savedSettings
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
};

exports.getGeneralSettings = async (req, res, next) => {
    try {
        const settings = await GeneralSettings.findOne({}).lean().exec();
        if (!settings) {
            return res.status(404).json({ success: false, message: 'Settings not found.' });
        }
        res.status(200).json({ success: true, message: 'General settings fetched successfully...', settings });
    } catch (error) {
        next(error);
    }
};

// ****************** SMTP setting *******************

exports.saveSmtpSettings = async (req, res, next) => {
    try {
        const { smtpHost, smtpPort, smtpEmail, smtpPassword, encryptionType } = req.body;

        // Check if settings already exist
        const existingSettings = await SmtpEmailSettings.findOne();
        if (existingSettings) {
            // Update existing settings
            existingSettings.smtpHost = smtpHost;
            existingSettings.smtpPort = smtpPort;
            existingSettings.smtpEmail = smtpEmail;
            existingSettings.smtpPassword = smtpPassword;
            existingSettings.encryptionType = encryptionType;

            const updatedSettings = await existingSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(200).json({
                success: true,
                message: 'SMTP Email settings updated successfully.',
                settings: updatedSettings,
            });
        } else {
            // Create new settings
            const newSettings = new SmtpEmailSettings({
                smtpHost,
                smtpPort,
                smtpEmail,
                smtpPassword,
                encryptionType,
            });
            const savedSettings = await newSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(201).json({
                success: true,
                message: 'SMTP Email settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getSmtpSettings = async (req, res, next) => {
    try {
        const settings = await SmtpEmailSettings.findOne().lean();

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'SMTP Email settings not found.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'SMTP Email settings fetched successfully.',
            settings,
        });
    } catch (error) {
        next(error);
    }
};

// ***************** social media settings ******************

exports.saveSocialMediaSettings = async (req, res, next) => {
    try {
        const { googleLogin, googleClientId, googleSecret, facebookLogin, facebookAppId, facebookClientSecret } = req.body;

        const existingSettings = await SocialMediaSettings.findOne();
        if (existingSettings) {
            // Update existing settings
            existingSettings.googleLogin = googleLogin;
            existingSettings.googleClientId = googleClientId;
            existingSettings.googleSecret = googleSecret;
            existingSettings.facebookLogin = facebookLogin;
            existingSettings.facebookAppId = facebookAppId;
            existingSettings.facebookClientSecret = facebookClientSecret;

            const updatedSettings = await existingSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(200).json({
                success: true,
                message: 'Social Media settings updated successfully.',
                settings: updatedSettings,
            });
        } else {
            // Create new settings
            const newSettings = new SocialMediaSettings({
                googleLogin,
                googleClientId,
                googleSecret,
                facebookLogin,
                facebookAppId,
                facebookClientSecret,
            });
            const savedSettings = await newSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(201).json({
                success: true,
                message: 'Social Media settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getSocialMediaSettings = async (req, res, next) => {
    try {
        const settings = await SocialMediaSettings.findOne().lean();
        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Social Media settings not found.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Social Media settings fetched successfully.',
            settings,
        });
    } catch (error) {
        next(error);
    }
};

// ******************* Menu settings ********************

exports.saveMenuSettings = async (req, res, next) => {
    try {
        const { story_, article, video__ } = req.body;

        const existingSettings = await MenuSettings.findOne();
        if (existingSettings) {
            // Update existing settings
            existingSettings.story_ = story_;
            existingSettings.article = article;
            existingSettings.video__ = video__;

            const updatedSettings = await existingSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(200).json({
                success: true,
                message: 'Menu settings updated successfully.',
                settings: updatedSettings,
            });
        } else {
            // Create new settings
            const newSettings = new MenuSettings({
                story_,
                article,
                video__,
            });
            const savedSettings = await newSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(201).json({
                success: true,
                message: 'Menu settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getMenuSettings = async (req, res, next) => {
    try {
        const settings = await MenuSettings.findOne().lean();
        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Menu settings not found.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Menu settings fetched successfully.',
            settings,
        });
    } catch (error) {
        next(error);
    }
};

// ******************* reCAPTCHA settings ********************

exports.saveRecaptchaSettings = async (req, res, next) => {
    try {
        const {
            siteKey, secretKey, enableOnLogin, enableOnSignup,
            enableOnForgotPassword, enableOnContactUs
        } = req.body;

        const existingSettings = await RecaptchaSettings.findOne();
        if (existingSettings) {
            // Update existing settings
            existingSettings.siteKey = siteKey;
            existingSettings.secretKey = secretKey;
            existingSettings.enableOnLogin = enableOnLogin;
            existingSettings.enableOnSignup = enableOnSignup;
            existingSettings.enableOnForgotPassword = enableOnForgotPassword;
            existingSettings.enableOnContactUs = enableOnContactUs;

            const updatedSettings = await existingSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(200).json({
                success: true,
                message: 'reCAPTCHA settings updated successfully.',
                settings: updatedSettings,
            });
        } else {
            // Create new settings
            const newSettings = new RecaptchaSettings({
                siteKey,
                secretKey,
                enableOnLogin,
                enableOnSignup,
                enableOnForgotPassword,
                enableOnContactUs,
            });
            const savedSettings = await newSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(201).json({
                success: true,
                message: 'reCAPTCHA settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getRecaptchaSettings = async (req, res, next) => {
    try {
        const settings = await RecaptchaSettings.findOne().lean();
        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'reCAPTCHA settings not found.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'reCAPTCHA settings fetched successfully.',
            settings,
        });
    } catch (error) {
        next(error);
    }
};

// ***************** Website banner ads Settings ******************

exports.saveBannerAdsSettings = async (req, res, next) => {
    try {
        const {
            homeTop, listTop, detailsTop, otherPagesTop,
            homeBottom, listBottom, detailsBottom, otherPagesBottom
        } = req.body;

        const existingAds = await BannerAdsSettings.findOne({});
        if (existingAds) {
            // Update existing ads
            existingAds.homeTop = homeTop;
            existingAds.listTop = listTop;
            existingAds.detailsTop = detailsTop;
            existingAds.otherPagesTop = otherPagesTop;
            existingAds.homeBottom = homeBottom;
            existingAds.listBottom = listBottom;
            existingAds.detailsBottom = detailsBottom;
            existingAds.otherPagesBottom = otherPagesBottom;

            const updatedAds = await existingAds.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(200).json({
                success: true,
                message: 'Banner ads updated successfully.',
                ads: updatedAds,
            });
        } else {
            // Create new ads
            const newAds = new BannerAdsSettings({
                homeTop,
                listTop,
                detailsTop,
                otherPagesTop,
                homeBottom,
                listBottom,
                detailsBottom,
                otherPagesBottom,
            });
            const savedAds = await newAds.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(201).json({
                success: true,
                message: 'Banner ads created successfully.',
                ads: savedAds,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getBannerAdsSettings = async (req, res, next) => {
    try {
        const settings = await BannerAdsSettings.findOne().lean();
        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Banner ads settings not found.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Banner ads fetched successfully.',
            settings,
        });
    } catch (error) {
        next(error);
    }
};

// ***************** site mentainence setting ********************

exports.saveMaintenanceModeSettings = async (req, res, next) => {
    try {
        const { enabled, message } = req.body;

        const existingSettings = await MaintenanceModeSettings.findOne();
        if (existingSettings) {
            // Update existing settings
            existingSettings.enabled = enabled;
            existingSettings.message = message;

            const updatedSettings = await existingSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(200).json({
                success: true,
                message: 'Maintenance mode settings updated successfully.',
                settings: updatedSettings,
            });
        } else {
            // Create new settings
            const newSettings = new MaintenanceModeSettings({
                enabled,
                message,
            });
            const savedSettings = await newSettings.save();

            // Clear node-cache
            clearCache("node-cache");

            return res.status(201).json({
                success: true,
                message: 'Maintenance mode settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getMaintenanceModeSettings = async (req, res, next) => {
    try {
        const settings = await MaintenanceModeSettings.findOne().lean();
        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance mode settings not found.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Maintenance mode settings fetched successfully.',
            settings,
        });
    } catch (error) {
        next(error);
    }
};
