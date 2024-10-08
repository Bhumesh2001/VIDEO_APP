const express = require('express');
const userRouter = express.Router();

// **************** controllers ****************

const userController = require('../controllers/userController/userCtrl');
const videoUserController = require('../controllers/userController/video.userCtrl');
const subscriptionUserController = require('../controllers/userController/subs.userCtrl');
const articleUserController = require('../controllers/userController/article.userCtrl');
const storyUserController = require('../controllers/userController/story.userCtrl');
const categorAdminController = require('../controllers/adminController/category.adminCtrl');
const couponUserController = require('../controllers/userController/coupon.userCtrl');
const bannerAdminController = require('../controllers/adminController/banner.adminCtrl');
const subscriptionPlanAdminController = require('../controllers/adminController/subs.admin.Ctrl');
const paymentGetwayController = require('../controllers/userController/pGetway.userCtrl');
const contactUserController = require('../controllers/userController/contact.userCtrl');

// ****************** middlewares *******************

const { userAuthentication } = require('../middlewares/userMiddleware/userMidlwr');
const {
    validateObjectIds,
    validateRequiredFields
} = require('../middlewares/adminMiddleware/validate.adminMidlwr');
const { cacheMiddleware } = require('../middlewares/userMiddleware/redisMidlwr');


// ********************* login/signup routes **********************

userRouter.post(
    '/register',
    validateRequiredFields(['name', 'email', 'password', 'mobileNumber']),
    userController.registerUser
);
userRouter.post(
    '/register/email',
    userController.registerUserWithEmailOrPhone
);
userRouter.post(
    '/verify',
    validateRequiredFields(['email', 'code']),
    userController.verifyUser
);
userRouter.post(
    '/login',
    validateRequiredFields(['email', 'password']),
    cacheMiddleware,
    userController.loginUser
);
userRouter.post(
    '/check-phone',
    cacheMiddleware,
    userController.checkMobileNumber
)
userRouter.post('/logout', userController.logoutUser);

userRouter.get('/auth/google', userController.redirectToGoogleProfile);
userRouter.get('/auth/google/callback', userController.getGoogleProfile);

userRouter.get('/auth/facebook', userController.redirectToFacebookProfile);
userRouter.get('/auth/facebook/callback', userController.getFacebookProfile);

userRouter.post(
    '/forgot-password',
    validateRequiredFields(['email']),
    userController.forgotPassword
);
userRouter.post(
    '/reset-password',
    validateRequiredFields(['email', 'newPassword']),
    userController.resetPassword
);
userRouter.post(
    '/resend-otp',
    validateRequiredFields(['email']),
    userController.resendOtp
);
userRouter.post(
    '/resend-code',
    validateRequiredFields(['email']),
    userController.resendVerificationCode
);
userRouter.post(
    '/verify-otp',
    validateRequiredFields(['email', 'otp']),
    userController.verifyOtp
);

// ******************** User profile routes ******************

userRouter.get('/profile', userAuthentication, userController.userProfile);
userRouter.put('/update-profile', userAuthentication, userController.updateUser);
userRouter.delete('/delete-profile', userAuthentication, userController.deleteUser);

// ****************** Countact Us routes **********************

userRouter.post(
    '/contat-us',
    userAuthentication,
    validateRequiredFields([
        'name', 'email', 'phone', 'city', 'district', 'state', 'country', 'pincode', 'message'
    ]),
    contactUserController.createContactUser
);

// ******************** video routes **********************

userRouter.get('/videos', userAuthentication, cacheMiddleware, videoUserController.getAllVideos);
userRouter.get(
    '/videos/by-category', 
    userAuthentication, 
    cacheMiddleware, 
    videoUserController.getAllVideosByCategory
);

// ******************** subscription routes **********************

userRouter.post(
    '/subscribe',
    userAuthentication,
    validateRequiredFields(['categoryId', 'planId']),
    subscriptionUserController.subscribeToCategoryOrAll
);
userRouter.post(
    '/subscription/update',
    userAuthentication,
    validateRequiredFields(['paymentStatus']),
    subscriptionUserController.updateSubscriptionStatus
);
userRouter.get(
    '/my-subscription',
    userAuthentication,
    subscriptionUserController.mySubscription
);

userRouter.get(
    '/subscription/plan',
    userAuthentication,
    cacheMiddleware,
    subscriptionPlanAdminController.getSubscriptionsPlan
);
userRouter.get('/history', userAuthentication, cacheMiddleware, subscriptionUserController.getHistory);
userRouter.get(
    '/single-history/:paymentId',
    userAuthentication,
    cacheMiddleware,
    subscriptionUserController.getSingleHistory
)

// ****************** coupans routes *****************

userRouter.get('/coupon', userAuthentication, cacheMiddleware, couponUserController.getCoupon);
userRouter.post(
    '/valid-coupon',
    userAuthentication,
    validateRequiredFields(['couponCode', 'planId']),
    couponUserController.applyCoupon
);

// ********************* category routes ********************

userRouter.get(
    '/categories',
    userAuthentication,
    cacheMiddleware,
    categorAdminController.getAllCategories
);

// ******************** banner routers ********************

userRouter.get('/banners', userAuthentication, cacheMiddleware, bannerAdminController.getAllBanners);

// ********************* article routes **********************

userRouter.post(
    '/create-article',
    userAuthentication,
    validateRequiredFields(['title', 'description']),
    articleUserController.createArticle
);
userRouter.get('/articles', userAuthentication, cacheMiddleware, articleUserController.getAllArticles);
userRouter.get(
    '/article',
    userAuthentication,
    validateObjectIds(['articleId']),
    cacheMiddleware,
    articleUserController.getSingleArticle
);
userRouter.put(
    '/update-article',
    userAuthentication,
    validateObjectIds(['articleId']),
    articleUserController.updateArticle
);
userRouter.delete(
    '/delete-article',
    userAuthentication,
    validateObjectIds(['articleId']),
    articleUserController.deleteArticle
);

// ******************** story routes *****************

userRouter.post(
    '/create-story',
    userAuthentication,
    storyUserController.createStory
);
userRouter.get(
    '/stories',
    userAuthentication,
    cacheMiddleware,
    storyUserController.getAllStories
);
userRouter.get(
    '/story',
    userAuthentication,
    validateObjectIds(['storyId']),
    cacheMiddleware,
    storyUserController.getSingleStory
);
userRouter.put(
    '/update-story',
    userAuthentication,
    validateObjectIds(['storyId']),
    storyUserController.updateStory
);
userRouter.delete(
    '/delete-story',
    userAuthentication,
    validateObjectIds(['storyId']),
    storyUserController.deleteStory
);

//  ******************* Article like/comment routes *********************

userRouter.post(
    '/article-like',
    userAuthentication,
    validateObjectIds(['articleId']),
    articleUserController.likeArticle
);

userRouter.post(
    '/article-comment',
    userAuthentication,
    validateObjectIds(['articleId']),
    validateRequiredFields(['content']),
    articleUserController.addComment
);
userRouter.get(
    '/article-comments',
    userAuthentication,
    validateObjectIds(['articleId']),
    cacheMiddleware,
    articleUserController.getAllComments
);
userRouter.put(
    '/article-comment-edit',
    userAuthentication,
    validateObjectIds(['articleId', 'commentId']),
    articleUserController.editComment
);
userRouter.delete(
    '/article-comment-delete',
    userAuthentication,
    validateObjectIds(['articleId', 'commentId']),
    articleUserController.deleteComment
);

// ************************ video like/comment routes *************************

userRouter.post(
    '/video-like',
    userAuthentication,
    validateObjectIds(['videoId']),
    videoUserController.likeVideo
);

userRouter.post(
    '/video-comment',
    userAuthentication,
    validateObjectIds(['videoId']),
    validateRequiredFields(['content']),
    videoUserController.addComment
);
userRouter.get(
    '/video-comments',
    userAuthentication,
    validateObjectIds(['videoId']),
    cacheMiddleware,
    videoUserController.getAllComments
);
userRouter.put(
    '/video-comment-edit',
    userAuthentication,
    validateObjectIds(['videoId', 'commentId']),
    videoUserController.editComment
);
userRouter.delete(
    '/video-comment-delete',
    userAuthentication,
    validateObjectIds(['videoId', 'commentId']),
    videoUserController.deleteComment
);

// ******************* razorpay routes *********************

userRouter.post(
    '/rozorpay/create-order',
    validateRequiredFields(['amount', 'currency']),
    paymentGetwayController.createOrder
);

userRouter.post(
    '/rozorpay/verify-payment',
    validateRequiredFields(['order_id', 'payment_id', 'signature']),
    paymentGetwayController.verifyPayment
);

module.exports = userRouter;