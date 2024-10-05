const express = require('express');
const adminRouter = express();

// ***************** admin controllers ******************

const adminController = require('../controllers/adminController/adminCtrl');
const categoryController = require('../controllers/adminController/category.adminCtrl');
const videoController = require('../controllers/adminController/video.adminCtrl');
const userAdminController = require('../controllers/adminController/user.adminCtrl');
const articleController = require('../controllers/adminController/article.adminCtrl');
const storyController = require('../controllers/adminController/story.adminCtrl');
const bannerController = require('../controllers/adminController/banner.adminCtrl');
const subscriptionController = require('../controllers/adminController/subs.admin.Ctrl');
const dashboardController = require('../controllers/adminController/dashboard.adminCtrl');
const couponController = require('../controllers/adminController/coupan.adminCtrl');
const contactUserController = require('../controllers/userController/contact.userCtrl');
const settingController = require('../controllers/adminController/settingCtrl');

// ****************** admin middlewares ******************

const { adminAuthentication } = require('../middlewares/adminMiddleware/auth.adminMdlwr');
const {
    validateObjectIds,
    validateRequiredFields
} = require('../middlewares/adminMiddleware/validate.adminMidlwr');
const { cacheMiddleware } = require('../middlewares/userMiddleware/redisMidlwr');

// ****************** login/signup routes ******************

adminRouter.post(
    '/create-admin',
    validateRequiredFields(['username', 'email', 'password']),
    adminController.createAdmin
);
adminRouter.post(
    '/login-admin',
    validateRequiredFields(['email', 'password']),
    adminController.loginAdmin
);

// ******************* profile routes *****************

adminRouter.get('/profile', adminAuthentication, adminController.adminProfile);
adminRouter.put('/update-profile', adminAuthentication, adminController.updateProfile);
adminRouter.post('/logout', adminAuthentication, adminController.logoutAdmin);

// ****************** Countact Us routes **********************

adminRouter.get(
    '/contact/users',
    adminAuthentication,
    cacheMiddleware,
    contactUserController.getAllContactUsers
);
adminRouter.get(
    '/contact/user/:userId',
    adminAuthentication,
    validateObjectIds(['userId']),
    cacheMiddleware,
    contactUserController.getContactUserById
);
adminRouter.put(
    '/contact/user/update/:userId',
    adminAuthentication,
    validateObjectIds(['userId']),
    contactUserController.updateContactUserById
);
adminRouter.delete(
    '/contact/user/delete/:userId',
    adminAuthentication,
    validateObjectIds(['userId']),
    contactUserController.deleteContactUserById
);

// ******************* video routes ********************

adminRouter.post(
    '/upload-video',
    adminAuthentication,
    videoController.uploadVideoToCloudinary
);
adminRouter.post('/mega/upload-video', adminAuthentication, videoController.uploadVideoToMega);
adminRouter.get('/videos', adminAuthentication, cacheMiddleware, videoController.getAllVideos);
adminRouter.get(
    '/videos-by-category',
    adminAuthentication,
    cacheMiddleware,
    videoController.getAllVideosByCategory
);

// ******************** Category routes ********************

adminRouter.post(
    '/create-category',
    adminAuthentication,
    validateRequiredFields(['name', 'description', 'status']),
    categoryController.createCategory
);
adminRouter.get(
    '/categories',
    adminAuthentication,
    cacheMiddleware,
    categoryController.getAllCategories
);
adminRouter.get(
    '/category',
    adminAuthentication,
    validateObjectIds(['categoryId']),
    cacheMiddleware,
    categoryController.getCategory
);
adminRouter.put(
    '/update-category',
    adminAuthentication,
    validateObjectIds(['categoryId']),
    categoryController.updateCategory
);
adminRouter.delete(
    '/delete-category',
    adminAuthentication,
    validateObjectIds(['categoryId']),
    categoryController.deleteCategories
);
adminRouter.get(
    '/category/options',
    adminAuthentication,
    cacheMiddleware,
    categoryController.getCategoryOption
)

// ***************** create user by admin routes *********************

adminRouter.post(
    '/create-user',
    adminAuthentication,
    validateRequiredFields(['name', 'email', 'password', 'mobileNumber']),
    userAdminController.createUserByAdmin
);
adminRouter.get('/users', adminAuthentication, cacheMiddleware, userAdminController.getAllUsersByAdmin);
adminRouter.get(
    '/user',
    adminAuthentication,
    validateObjectIds(['userId']),
    cacheMiddleware,
    userAdminController.getSingleUserByAdmin
);
adminRouter.put(
    '/update-user',
    adminAuthentication,
    validateObjectIds(['userId']),
    userAdminController.updateUserByAdmin
);
adminRouter.delete(
    '/delete-user',
    adminAuthentication,
    validateObjectIds(['userId']),
    userAdminController.deleteUserByAdmin
);

// ******************** Article routes *******************

adminRouter.post(
    '/create-article',
    adminAuthentication,
    validateRequiredFields(['title', 'description']),
    articleController.createArticle
);
adminRouter.get('/articls', adminAuthentication, cacheMiddleware, articleController.getAllArticles);
adminRouter.get(
    '/article',
    adminAuthentication,
    validateObjectIds(['articleId']),
    cacheMiddleware,
    articleController.getSingleArticle
);
adminRouter.put(
    '/update-article',
    adminAuthentication,
    validateObjectIds(['articleId']),
    articleController.updateArticle
);
adminRouter.delete(
    '/delete-article',
    adminAuthentication,
    validateObjectIds(['articleId']),
    articleController.deleteArticle
);

// *************** story routes ****************

adminRouter.post(
    '/create-story',
    adminAuthentication,
    validateRequiredFields(['title', 'caption']),
    storyController.createStoryByAdmin
);
adminRouter.get('/stories', adminAuthentication, cacheMiddleware, storyController.getAllStoriesByAdmin);
adminRouter.get(
    '/story',
    adminAuthentication,
    validateObjectIds(['storyId']),
    cacheMiddleware,
    storyController.getSingleStoryByAdmin
);
adminRouter.put(
    '/update-story',
    adminAuthentication,
    validateObjectIds(['storyId']),
    storyController.updateStoryByAdmin
);
adminRouter.delete(
    '/delete-story',
    adminAuthentication,
    validateObjectIds(['storyId']),
    storyController.deleteStoryByAdmin
);

// ***************** Banner routes **************
adminRouter.post(
    '/create-banner',
    adminAuthentication,
    validateRequiredFields(['title', 'description']),
    bannerController.createBanner
);
adminRouter.get('/banners', adminAuthentication, cacheMiddleware, bannerController.getAllBanners);
adminRouter.get(
    '/banner',
    adminAuthentication,
    validateObjectIds(['bannerId']),
    cacheMiddleware,
    bannerController.getSingleBanner
);
adminRouter.put(
    '/update-banner',
    adminAuthentication,
    validateObjectIds(['bannerId']),
    bannerController.updateBanner
);
adminRouter.delete(
    '/delete-banner',
    adminAuthentication,
    validateObjectIds(['bannerId']),
    bannerController.deleteBanner
);

// ****************** subscription routes *********************

adminRouter.post(
    '/create-subscription',
    adminAuthentication,
    validateRequiredFields(['planName', 'planType', 'price', 'features', 'discount']),
    subscriptionController.createSubscriptionPlan
);
adminRouter.get(
    '/subscriptions',
    adminAuthentication,
    cacheMiddleware,
    subscriptionController.getSubscriptionsPlan
);
adminRouter.get(
    '/subscription',
    adminAuthentication,
    validateObjectIds(['subscriptionId']),
    cacheMiddleware,
    subscriptionController.getSubscriptionPlanById
);
adminRouter.put(
    '/update-subscription',
    adminAuthentication,
    validateObjectIds(['subscriptionId']),
    subscriptionController.updateSubscriptionPlan
);
adminRouter.delete(
    '/delete-subscription',
    adminAuthentication,
    validateObjectIds(['subscriptionId']),
    subscriptionController.deleteSubscriptionPlan
);

// ******************* total likes and comment routes ****************

adminRouter.get(
    '/dashboard-count',
    adminAuthentication,
    cacheMiddleware,
    dashboardController.dashboardCount
);

// ******************* coupan code routes *****************

adminRouter.post(
    '/create-coupon',
    adminAuthentication,
    validateRequiredFields(['expirationDate', 'maxUsage']),
    couponController.createCoupon
);
adminRouter.get('/coupons', adminAuthentication, cacheMiddleware, couponController.getCoupons);
adminRouter.get(
    '/coupon',
    adminAuthentication,
    validateObjectIds(['couponId']),
    cacheMiddleware,
    couponController.getCouponById
);
adminRouter.put(
    '/update-coupon',
    adminAuthentication,
    validateObjectIds(['couponId']),
    couponController.updateCoupon
);
adminRouter.delete(
    '/delete-coupon',
    validateObjectIds(['couponId']),
    adminAuthentication,
    couponController.deleteCoupon
);

// ******************** setting routes ******************

adminRouter.route('/setting/general')
    .post(adminAuthentication, settingController.saveGeneralSettings)
    .get(adminAuthentication, cacheMiddleware, settingController.getGeneralSettings)

adminRouter.route('/setting/smtp')
    .post(adminAuthentication, settingController.saveSmtpSettings)
    .get(adminAuthentication, cacheMiddleware, settingController.getSmtpSettings)

adminRouter.route('/setting/social-media')
    .post(adminAuthentication, settingController.saveSocialMediaSettings)
    .get(adminAuthentication, cacheMiddleware, settingController.getSocialMediaSettings)

adminRouter.route('/setting/menu')
    .post(adminAuthentication, settingController.saveMenuSettings)
    .get(adminAuthentication, cacheMiddleware, settingController.getMenuSettings)

adminRouter.route('/setting/re-captcha')
    .post(adminAuthentication, settingController.saveRecaptchaSettings)
    .get(adminAuthentication, cacheMiddleware, settingController.getRecaptchaSettings)

adminRouter.route('/setting/banner-ads')
    .post(adminAuthentication, settingController.saveBannerAdsSettings)
    .get(adminAuthentication, cacheMiddleware, settingController.getBannerAdsSettings)

adminRouter.route('/setting/maintenance-mode')
    .post(adminAuthentication, settingController.saveMaintenanceModeSettings)
    .get(adminAuthentication, cacheMiddleware, settingController.getMaintenanceModeSettings)

module.exports = adminRouter;
