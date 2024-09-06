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
const paymentGetwayController = require('../controllers/adminController/pGetway.adminCtrl');
const dashboardController = require('../controllers/adminController/dashboard.adminCtrl');
const couponController = require('../controllers/adminController/coupan.adminCtrl');

// ****************** admin middlewares ******************

const { adminAuth } = require('../middlewares/adminMiddleware/auth.adminMdlwr');
const {
    validateObjectIds,
    validateRequiredFields
} = require('../middlewares/adminMiddleware/validate.adminMidlwr');

// ****************** login/signup routes ******************

adminRouter.get('/', adminController.adminLoginPage);
adminRouter.get('/dashboard', adminController.adminDashboard);

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

adminRouter.get('/profile', adminAuth, adminController.adminProfile);
adminRouter.put('/update-profile', adminAuth, adminController.updateProfile);
adminRouter.post('/logout', adminAuth, adminController.LogoutAdmin);

// ******************* video routes ********************

adminRouter.post(
    '/upload-video',
    adminAuth,
    videoController.uploadVideoToCloudinary
);
adminRouter.get('/videos', videoController.getAllvideos);
adminRouter.get('/videos-by-category', adminAuth, videoController.getAllvideosByCategory);

// ******************** Category routes *******************

adminRouter.post(
    '/create-category',
    adminAuth,
    validateRequiredFields(['name', 'description', 'status']),
    categoryController.createCategory
);
adminRouter.get('/categories', categoryController.getAllCategories);
adminRouter.get(
    '/category',
    adminAuth,
    validateObjectIds(['categoryId']),
    categoryController.getCategory
);
adminRouter.put(
    '/update-category',
    adminAuth,
    validateObjectIds(['categoryId']),
    validateRequiredFields(['name', 'description', 'status']),
    categoryController.updateCategory
);
adminRouter.delete(
    '/delete-category',
    adminAuth,
    validateObjectIds(['categoryId']),
    categoryController.deleteCategories
);

// ***************** create user by admin routes *********************

adminRouter.post(
    '/create-user',
    adminAuth,
    validateRequiredFields(['name', 'email', 'password', 'mobileNumber']),
    userAdminController.createUserByAdmin
);
adminRouter.get('/users', userAdminController.getAllUsersByAdmin);
adminRouter.get(
    '/user',
    adminAuth,
    validateObjectIds(['userId']),
    userAdminController.getSingleUserByAdmin
);
adminRouter.put(
    '/update-user',
    adminAuth,
    validateObjectIds(['userId']),
    validateRequiredFields(['name', 'email', 'password', 'mobileNumber', 'status']),
    userAdminController.updateUserByAdmin
);
adminRouter.delete(
    '/delete-user',
    adminAuth,
    validateObjectIds(['userId']),
    userAdminController.deleteUserByAdmin
);

// ******************** Article routes *******************

adminRouter.post(
    '/create-article',
    adminAuth,
    validateRequiredFields(['title', 'content', 'authorName', 'publicationDate', 'topic']),
    articleController.createArticle
);
adminRouter.get('/articls', articleController.getAllArticles);
adminRouter.get(
    '/article',
    adminAuth,
    validateObjectIds(['articleId']),
    articleController.getSingleArticle
);
adminRouter.put(
    '/update-article',
    adminAuth,
    validateObjectIds(['articleId']),
    validateRequiredFields(['title', 'content', 'authorName', 'publicationDate', 'topic']),
    articleController.updateArticle
);
adminRouter.delete(
    '/delete-article',
    adminAuth,
    validateObjectIds(['articleId']),
    articleController.deleteArticle
);

// *************** story routes ****************

adminRouter.post(
    '/create-story',
    adminAuth,
    validateRequiredFields(['title', 'video', 'caption', 'duration']),
    storyController.createStory
);
adminRouter.get('/stories', storyController.getAllStories);
adminRouter.get('/story', adminAuth, validateObjectIds(['storyId']), storyController.getSingleStory);
adminRouter.put(
    '/update-story',
    adminAuth,
    validateObjectIds(['storyId']),
    validateRequiredFields(['title', 'video', 'caption', 'duration', 'status']),
    storyController.updateStory
);
adminRouter.delete('/delete-story', adminAuth, validateObjectIds(['storyId']), storyController.deleteStory);

// ***************** Banner routes **************
adminRouter.post(
    '/create-banner',
    adminAuth,
    validateRequiredFields(['title', 'description']),
    bannerController.createBanner
);
adminRouter.get('/banners', adminAuth, bannerController.getAllBanners);
adminRouter.get('/banner', adminAuth, validateObjectIds(['bannerId']), bannerController.getSingleBanner);
adminRouter.put(
    '/update-banner',
    adminAuth,
    validateObjectIds(['bannerId']),
    validateRequiredFields(['title', 'description', 'status']),
    bannerController.updateBanner
);
adminRouter.delete(
    '/delete-banner',
    adminAuth,
    validateObjectIds(['bannerId']),
    bannerController.deleteBanner
);

// ****************** subscription routes *********************

adminRouter.post(
    '/create-subscription',
    adminAuth,
    validateRequiredFields(['plan', 'price', 'features', 'status']),
    subscriptionController.createSubscription
);
adminRouter.get('/subscriptions', adminAuth, subscriptionController.getSubscriptions);
adminRouter.get(
    '/subscription',
    adminAuth,
    validateObjectIds(['subscriptionId']),
    subscriptionController.getSubscriptionById
);
adminRouter.put(
    '/update-subscription',
    adminAuth,
    validateObjectIds(['subscriptionId']),
    validateRequiredFields(['plan', 'price', 'features', 'status']),
    subscriptionController.updateSubscription
);
adminRouter.delete(
    '/delete-subscription',
    adminAuth,
    validateObjectIds(['subscriptionId']),
    subscriptionController.deleteSubscription
);

// ******************* total likes and comment routes ****************

adminRouter.get('/dashboard-count', dashboardController.dashboardCount);

// ******************* coupan code routes *****************

adminRouter.post(
    '/create-coupon',
    adminAuth,
    validateRequiredFields(['discountPercentage', 'expirationDate', 'maxUsage']),
    couponController.createCoupon
);
adminRouter.get('/coupons', adminAuth, couponController.getCoupons);
adminRouter.get(
    '/coupon',
    adminAuth,
    validateObjectIds(['couponId']),
    couponController.getCouponById
);
adminRouter.put(
    '/update-coupon',
    adminAuth,
    validateObjectIds(['couponId']),
    couponController.updateCoupon
);
adminRouter.delete(
    '/delete-coupon',
    validateObjectIds(['couponId']),
    adminAuth,
    couponController.deleteCoupon
);

// ******************* razorpay routes *********************

adminRouter.post('/create-order', adminAuth, paymentGetwayController.createOrder);
adminRouter.post('/verify-payment', adminAuth, paymentGetwayController.verifyPayment);

module.exports = adminRouter;
