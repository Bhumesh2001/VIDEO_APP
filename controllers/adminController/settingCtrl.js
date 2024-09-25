const fs = require('fs').promises;
const {
    GeneralSettings,
    SmtpEmailSettings,
    SocialMediaSettings,
    MenuSettings,
    RecaptchaSettings,
    BannerAdsSettings,
    MaintenanceModeSettings,
} = require('../../models/adminModel/settingModel');

const { uploadImage, deleteImageOnCloudinary } = require('../../utils/uploadUtil');

// ****************** General settings ******************

const siteLogoOptions = {
    folder: 'SiteLogos',
    transformation: [
        { width: 250, height: 150, crop: 'fill' }
    ]
};
const siteFaviconOptions = {
    folder: 'SiteFavicons',
    transformation: [
        { width: 16, height: 16, crop: 'fill' }
    ]
};

exports.saveGeneralSettings = async (req, res) => {
    let { siteName, siteLogo, siteKeywords, siteFavicon, email, _description, headerCode, footerCode,
        copyrightText, facebook, twitter, instagram, googlePlay, appStore } = req.body;

    try {
        const existingSettings = await GeneralSettings.findOne({});

        // Helper function to process both image files and URLs and upload to the cloud
        const processImage = async (file, url, options) => {
            if (existingSettings.siteLogo.public_id) {
                await deleteImageOnCloudinary(existingSettings.siteLogo.public_id);
            }
            if (existingSettings.siteFavicon.public_id) {
                await deleteImageOnCloudinary(existingSettings.siteFavicon.public_id);
            }
            if (file) {
                const uploadedImage = await uploadImage(file.tempFilePath, options);
                return { url: uploadedImage.url, public_id: uploadedImage.public_id };
            } else if (url) {
                const uploadedImage = await uploadImage(url, options);  // Upload the URL directly
                return { url: uploadedImage.url, public_id: uploadedImage.public_id };
            }
            return { url: '', public_id: '' };

        };

        // Check for file or URL for logo and favicon, process and upload them
        const imageData = {
            siteLogo: await processImage(req.files?.siteLogo, siteLogo, siteLogoOptions),
            siteFavicon: await processImage(req.files?.siteFavicon, siteFavicon, siteFaviconOptions)
        };

        if(req.files.siteFavicon) await fs.unlink(req.files.siteFavicon.tempFilePath);
        if(req.files.siteLogo) await fs.unlink(req.files.siteLogo.tempFilePath);

        // Prepare data for updating or creating settings
        const settingsData = {
            siteName: siteName || existingSettings?.siteName,

            // Ensure the image data is handled correctly
            siteLogo: imageData.siteLogo.url ? imageData.siteLogo : existingSettings?.siteLogo,
            siteFavicon: imageData.siteFavicon.url ? imageData.siteFavicon : existingSettings?.siteFavicon,

            siteKeywords: siteKeywords || existingSettings?.siteKeywords,
            email: email || existingSettings?.email,
            _description: _description || existingSettings?._description,
            headerCode: headerCode || existingSettings?.headerCode,
            footerCode: footerCode || existingSettings?.footerCode,
            copyrightText: copyrightText || existingSettings?.copyrightText,

            // Merge nested objects for social media links and app download links
            socialMediaLinks: {
                facebook: facebook || existingSettings?.socialMediaLinks?.facebook,
                twitter: twitter || existingSettings?.socialMediaLinks?.twitter,
                instagram: instagram || existingSettings?.socialMediaLinks?.instagram
            },
            appDownloadLinks: {
                googlePlay: googlePlay || existingSettings?.appDownloadLinks?.googlePlay,
                appStore: appStore || existingSettings?.appDownloadLinks?.appStore
            }
        };

        // Save settings
        const savedSettings = existingSettings ?
            await GeneralSettings.findByIdAndUpdate(existingSettings._id, settingsData, { new: true }) :
            await new GeneralSettings(settingsData).save();

        res.status(existingSettings ? 200 : 201).json({
            success: true,
            message: existingSettings ? 'Settings updated successfully.' : 'Settings created successfully.',
            settings: savedSettings
        });

    } catch (error) {
        console.error('Error saving general settings:', error);
        res.status(500).json({ success: false, message: 'Error occurred while saving settings.', error: error.message });
    }
};

exports.getGeneralSettings = async (req, res) => {
    try {
        const settings = await GeneralSettings.findOne({}).lean().exec();
        if (!settings) {
            return res.status(404).json({ success: false, message: 'Settings not found.' });
        }
        res.status(200).json({ success: true, message: 'General settings fetched successfully...', settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, message: 'Error occurred while fetching settings.', error: error.message });
    }
};

// ****************** SMTP setting *******************

exports.saveSmtpSettings = async (req, res) => {
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

            return res.status(201).json({
                success: true,
                message: 'SMTP Email settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while creating/updating SMTP settings.',
            error: error.message,
        });
    }
};

exports.getSmtpSettings = async (req, res) => {
    try {
        const settings = await SmtpEmailSettings.findOne();

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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching SMTP settings.',
            error: error.message,
        });
    }
};

// ***************** social media settings ******************

exports.saveSocialMediaSettings = async (req, res) => {
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

            return res.status(201).json({
                success: true,
                message: 'Social Media settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while creating/updating Social Media settings.',
            error: error.message,
        });
    }
};

exports.getSocialMediaSettings = async (req, res) => {
    try {
        const settings = await SocialMediaSettings.findOne();

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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching Social Media settings.',
            error: error.message,
        });
    }
};

// ******************* Menu settings ********************

exports.saveMenuSettings = async (req, res) => {
    try {
        const { story, article, video__ } = req.body;

        const existingSettings = await MenuSettings.findOne();

        if (existingSettings) {
            // Update existing settings
            existingSettings.story = story;
            existingSettings.article = article;
            existingSettings.video__ = video__;

            const updatedSettings = await existingSettings.save();

            return res.status(200).json({
                success: true,
                message: 'Menu settings updated successfully.',
                settings: updatedSettings,
            });
        } else {
            // Create new settings
            const newSettings = new MenuSettings({
                story,
                article,
                video__,
            });

            const savedSettings = await newSettings.save();

            return res.status(201).json({
                success: true,
                message: 'Menu settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while creating/updating menu settings.',
            error: error.message,
        });
    }
};

exports.getMenuSettings = async (req, res) => {
    try {
        const settings = await MenuSettings.findOne();

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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching menu settings.',
            error: error.message,
        });
    }
};

// ******************* reCAPTCHA settings ********************

exports.saveRecaptchaSettings = async (req, res) => {
    try {
        const { siteKey, secretKey, enableOnLogin, enableOnSignup, enableOnForgotPassword, enableOnContactUs } = req.body;

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

            return res.status(201).json({
                success: true,
                message: 'reCAPTCHA settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while creating/updating reCAPTCHA settings.',
            error: error.message,
        });
    }
};

exports.getRecaptchaSettings = async (req, res) => {
    try {
        const settings = await RecaptchaSettings.findOne();

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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching reCAPTCHA settings.',
            error: error.message,
        });
    }
};

// ***************** Website banner ads Settings ******************

exports.saveBannerAdsSettings = async (req, res) => {
    try {
        const { homeTop, listTop, detailsTop, otherPagesTop, homeBottom, listBottom, detailsBottom, otherPagesBottom } = req.body;

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

            return res.status(201).json({
                success: true,
                message: 'Banner ads created successfully.',
                ads: savedAds,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while creating/updating banner ads.',
            error: error.message,
        });
    }
};

exports.getBannerAdsSettings = async (req, res) => {
    try {
        const settings = await BannerAdsSettings.findOne();

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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching banner ads.',
            error: error.message,
        });
    }
};

// ***************** site mentainence setting ********************

exports.saveMaintenanceModeSettings = async (req, res) => {
    try {
        const { enabled, message } = req.body;

        const existingSettings = await MaintenanceModeSettings.findOne();

        if (existingSettings) {
            // Update existing settings
            existingSettings.enabled = enabled;
            existingSettings.message = message;

            const updatedSettings = await existingSettings.save();

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

            return res.status(201).json({
                success: true,
                message: 'Maintenance mode settings created successfully.',
                settings: savedSettings,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while creating/updating maintenance mode settings.',
            error: error.message,
        });
    }
};

exports.getMaintenanceModeSettings = async (req, res) => {
    try {
        const settings = await MaintenanceModeSettings.findOne();

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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching maintenance mode settings.',
            error: error.message,
        });
    }
};
