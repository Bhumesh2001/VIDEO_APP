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

// ****************** admin middlewares ******************

const { adminAuthentication } = require('../middlewares/adminMiddleware/auth.adminMdlwr');
const {
    validateObjectIds,
    validateRequiredFields
} = require('../middlewares/adminMiddleware/validate.adminMidlwr');

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

adminRouter.get('/contact/users', adminAuthentication, contactUserController.getAllContactUsers);
adminRouter.get(
    '/contact/user/:userId', 
    adminAuthentication, 
    validateObjectIds(['userId']),
    contactUserController.getContactUserById
);
adminRouter.put(
    '/contact/user/update/:userId',
    adminAuthentication,
    validateObjectIds(['userId']),
    validateRequiredFields([
        'name', 'email', 'phone', 'city', 'district', 'state', 'country', 'pincode', 'message'
    ]),
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
adminRouter.get('/videos', videoController.getAllvideos);
adminRouter.get('/videos-by-category', adminAuthentication, videoController.getAllvideosByCategory);

// ******************** Category routes ********************

adminRouter.post(
    '/create-category',
    adminAuthentication,
    validateRequiredFields(['name', 'description', 'status']),
    categoryController.createCategory
);
adminRouter.get('/categories', categoryController.getAllCategories);
adminRouter.get(
    '/category',
    adminAuthentication,
    validateObjectIds(['categoryId']),
    categoryController.getCategory
);
adminRouter.put(
    '/update-category',
    adminAuthentication,
    validateObjectIds(['categoryId']),
    validateRequiredFields(['name', 'description', 'status']),
    categoryController.updateCategory
);
adminRouter.delete(
    '/delete-category',
    adminAuthentication,
    validateObjectIds(['categoryId']),
    categoryController.deleteCategories
);

// ***************** create user by admin routes *********************

adminRouter.post(
    '/create-user',
    adminAuthentication,
    validateRequiredFields(['name', 'email', 'password', 'mobileNumber']),
    userAdminController.createUserByAdmin
);
adminRouter.get('/users', userAdminController.getAllUsersByAdmin);
adminRouter.get(
    '/user',
    adminAuthentication,
    validateObjectIds(['userId']),
    userAdminController.getSingleUserByAdmin
);
adminRouter.put(
    '/update-user',
    adminAuthentication,
    validateObjectIds(['userId']),
    validateRequiredFields(['name', 'email', 'password', 'mobileNumber', 'status']),
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
adminRouter.get('/articls', articleController.getAllArticles);
adminRouter.get(
    '/article',
    adminAuthentication,
    validateObjectIds(['articleId']),
    articleController.getSingleArticle
);
adminRouter.put(
    '/update-article',
    adminAuthentication,
    validateObjectIds(['articleId']),
    validateRequiredFields(['title', 'description']),
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
adminRouter.get('/stories', storyController.getAllStoriesByAdmin);
adminRouter.get(
    '/story', 
    adminAuthentication, 
    validateObjectIds(['storyId']), 
    storyController.getSingleStoryByAdmin
);
adminRouter.put(
    '/update-story',
    adminAuthentication,
    validateObjectIds(['storyId']),
    validateRequiredFields(['title', 'caption', 'status']),
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
adminRouter.get('/banners', adminAuthentication, bannerController.getAllBanners);
adminRouter.get(
    '/banner', 
    adminAuthentication, 
    validateObjectIds(['bannerId']), 
    bannerController.getSingleBanner
);
adminRouter.put(
    '/update-banner',
    adminAuthentication,
    validateObjectIds(['bannerId']),
    validateRequiredFields(['title', 'description', 'status']),
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
    validateRequiredFields(['planName','planType', 'price', 'features', 'status']),
    subscriptionController.createSubscriptionPlan
);
adminRouter.get('/subscriptions', subscriptionController.getSubscriptionsPlan);
adminRouter.get(
    '/subscription',
    adminAuthentication,
    validateObjectIds(['subscriptionId']),
    subscriptionController.getSubscriptionPlanById
);
adminRouter.put(
    '/update-subscription',
    adminAuthentication,
    validateObjectIds(['subscriptionId']),
    validateRequiredFields(['planName','planType', 'price', 'features', 'status']),
    subscriptionController.updateSubscriptionPlan
);
adminRouter.delete(
    '/delete-subscription',
    adminAuthentication,
    validateObjectIds(['subscriptionId']),
    subscriptionController.deleteSubscriptionPlan
);

// ******************* total likes and comment routes ****************

adminRouter.get('/dashboard-count', dashboardController.dashboardCount);

// ******************* coupan code routes *****************

adminRouter.post(
    '/create-coupon',
    adminAuthentication,
    validateRequiredFields(['discountPercentage', 'expirationDate', 'maxUsage']),
    couponController.createCoupon
);
adminRouter.get('/coupons', couponController.getCoupons);
adminRouter.get(
    '/coupon',
    adminAuthentication,
    validateObjectIds(['couponId']),
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

module.exports = adminRouter;
