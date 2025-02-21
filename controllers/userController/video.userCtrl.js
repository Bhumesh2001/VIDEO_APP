const Video = require('../../models/adminModel/video.adminModel');
const { UserSubscription } = require('../../utils/subs.userUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.getAllVideos = async (req, res, next) => {
    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'User ID not found!',
            });
        };

        // Fetch user subscription details
        const userSubscription = await UserSubscription(userId);
        const subscribedCategoryName = userSubscription?.name || '';

        // Fetch all videos from DB
        let videos = await Video.find({}, { __v: 0 }).sort({ createdAt: -1 }).lean();

        // If user has 'all' in categoryId, mark all videos as paid
        if (subscribedCategoryName === 'all' || subscribedCategoryName === 'All') {
            videos = videos.map(video => ({
                ...video,
                thumbnail: video.thumbnail.url,
                likes: video.likes.length,
                comments: video.comments.length,
                video: video.video.url,
                paid: true,  // User has paid for all categories
            }));
        } else {
            // For specific category subscriptions
            videos = videos.map(video => ({
                ...video,
                thumbnail: video.thumbnail.url,
                likes: video.likes.length,
                comments: video.comments.length,
                video: video.video.url,
                // Check if video belongs to a paid category
                paid: subscribedCategoryName === video.category,
            }));
        };

        if (videos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Videos not found!',
            });
        };

        res.status(200).json({
            success: true,
            message: 'All videos fetched successfully...',
            videos,
        });
    } catch (error) {
        next(error);
    };
};

exports.getAllVideosByCategory = async (req, res, next) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required',
            });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated or ID not found!',
            });
        }
        const userId = req.user._id;

        let videosByCategory = await Video.find({ category: category.toLowerCase() }, { __v: 0 }).lean();
        if (videosByCategory.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Videos not found!",
            });
        }

        // Fetch user subscription
        let userSubscription;
        try {
            userSubscription = await UserSubscription(userId);
        } catch (subError) {
            return res.status(500).json({
                success: false,
                message: `Subscription error: ${subError.message}`,
            });
        }
        const subscribedCategoryName = userSubscription?.name?.toLowerCase() || '';

        // Transform video data
        videosByCategory = videosByCategory.map(video => {
            const isPaid = subscribedCategoryName === 'all' || subscribedCategoryName === video.category;
            return {
                ...video,
                thumbnail: video.thumbnail?.url || '',
                likes: video.likes?.length || 0,
                comments: video.comments?.length || 0,
                video: video.video?.url || '',
                paid: isPaid,
            };
        });

        res.status(200).json({
            success: true,
            message: "Videos fetched by category successfully...",
            videosByCategory,
        });
    } catch (error) {
        next(error);
    }
};

// 🔥 Fetch Related Videos API
exports.getRelatedVideos = async (req, res, next) => {
    try {
        const { videoId } = req.params;

        // Get the Current Video
        const currentVideo = await Video.findById(videoId).select('category').lean();
        if (!currentVideo) {
            return res.status(404).json({ success: false, message: "Video not found" });
        }

        // Find Related Videos (case-insensitive)
        const relatedVideos = await Video.find({
            _id: { $ne: videoId },
            category: { $regex: new RegExp(`^${currentVideo.category}$`, 'i') },
        }, { __v: 0 })
            .lean()
            .then(videos => videos.sort((a, b) => b.likes.length - a.likes.length).slice(0, 10));

        res.status(200).json({
            success: true,
            message: relatedVideos.length > 0 ? 'Related videos fetched successfully...!' : 'No related videos found',
            data: relatedVideos,
        });
    } catch (error) {
        next(error);
    }
};

// like a video
exports.likeVideo = async (req, res, next) => {
    try {
        const { videoId } = req.body;
        const userId = req.user._id;

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

        let like;
        if (video.likes.includes(userId)) {
            video.likes.pull(userId);
            like = false;
        } else {
            video.likes.push(userId);
            like = true;
        };
        await video.save();

        res.status(200).json({ success: true, like, video, });
    } catch (error) {
        next(error);
    };
};

// comment a video
exports.addComment = async (req, res, next) => {
    try {
        const { videoId, content } = req.body;
        const userId = req.user._id;

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

        video.comments.push({ userId, content });
        await video.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({ success: true, message: 'Comment added successfully', video });
    } catch (error) {
        next(error);
    };
};

exports.getAllComments = async (req, res, next) => {
    try {
        const { videoId } = req.query || req.body;

        const video = await Video.findById(videoId).select('comments');
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found',
            });
        };
        const sortedComments = video.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            success: true,
            message: 'Comment fetched successfully...',
            comments: sortedComments,
        });
    } catch (error) {
        next(error);
    };
};

exports.editComment = async (req, res, next) => {
    try {
        const { videoId, commentId } = req.body || req.query;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required',
            });
        };

        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found',
            });
        };

        const comment = video.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found',
            });
        };

        comment.content = content;
        comment.updatedAt = Date.now();
        await video.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Comment updated successfully',
            comment,
            video,
        });
    } catch (error) {
        next(error);
    };
};

exports.deleteComment = async (req, res, next) => {
    try {
        const { videoId, commentId } = req.body || req.query;

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

        const commentIndex = video.comments.findIndex(comment => comment._id.toString() === commentId);
        if (commentIndex === -1) return res.status(404).json({ success: false, message: 'Comment not found' });

        video.comments.splice(commentIndex, 1);
        await video.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({ success: true, message: 'Comment deleted successfully', video });
    } catch (error) {
        next(error);
    };
};
