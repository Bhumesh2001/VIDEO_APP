const express = require('express');
const userRouter = express.Router();

// **************** controllers ****************

const userController = require('../controllers/userController/userCtrl');
const videoUserController = require('../controllers/userController/video.userCtrl');
const paymentUserController = require('../controllers/userController/payment.userCtrl');
const articleUserController = require('../controllers/userController/article.userCtrl');
const storyUserController = require('../controllers/userController/story.userCtrl');
const categorAdminController = require('../controllers/adminController/category.adminCtrl');
const couponUserController = require('../controllers/userController/coupon.userCtrl');
const bannerAdminController = require('../controllers/adminController/banner.adminCtrl');

// ****************** middlewares *******************

const { userAuthentication } = require('../middlewares/userMiddleware/userMidlwr');
const {
    validateObjectIds,
    validateRequiredFields
} = require('../middlewares/adminMiddleware/validate.adminMidlwr');

// ********************* login/signup routes **********************

userRouter.post('/register', userController.registerUser);
userRouter.post('/verify-user', userController.verifyUser);
userRouter.post('/login', userController.loginUser);
userRouter.post('/logout', userController.logoutUser);

userRouter.get('/auth/google', userController.redirectToGoogleProfile);
userRouter.get('/auth/google/callback', userController.getGoogleProfile);

userRouter.get('/auth/facebook', userController.redirectToFacebookProfile);
userRouter.get('/auth/facebook/callback', userController.getFacebookProfile);

userRouter.get('/resend-otp', userController.resendCodeOrOtp);


// ******************** User profile routes *****************

userRouter.put('/update-profile', userAuthentication, userController.updateUser);
userRouter.delete('/delete-profile', userAuthentication, userController.deleteUser);

// ******************** video routes **********************

userRouter.get('/videos', userAuthentication, videoUserController.getAllVideos);
userRouter.get('/videos/by-category', userAuthentication, videoUserController.getAllVideosByCategory);

// ******************** Payments routes **********************

userRouter.post('/create-payment', userAuthentication, paymentUserController.CreatePayment);
userRouter.get('/payments', userAuthentication, paymentUserController.getAllPayments);
userRouter.get(
    '/payment',
    userAuthentication,
    validateObjectIds(['paymentId']),
    paymentUserController.getSinglePayment
);

// ****************** coupans routes *****************

userRouter.get('/coupon', userAuthentication, couponUserController.getCoupon);

// ********************* category routes ********************

userRouter.get(
    '/categories',
    userAuthentication,
    categorAdminController.getAllCategories
);

// ******************** banner routers ********************

userRouter.get('/banners', userAuthentication, bannerAdminController.getAllBanners);

// ********************* article routes **********************

userRouter.post(
    '/create-article',
    userAuthentication,
    validateRequiredFields(['title', 'content', 'authorName', 'publicationDate', 'image', 'topic']),
    articleUserController.createArticle
);
userRouter.get('/articles', userAuthentication, articleUserController.getAllArticles);
userRouter.get(
    '/article',
    userAuthentication,
    validateObjectIds(['articleId']),
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
    validateRequiredFields(['title', 'authorName', 'publicationDate', 'genre', 'image']),
    storyUserController.createStory
);
userRouter.get(
    '/stories',
    userAuthentication,
    storyUserController.getAllStories
);
userRouter.get(
    '/story',
    userAuthentication,
    validateObjectIds(['storyId']),
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

module.exports = userRouter;