const Video = require('../../models/adminModel/video.adminModel');
const userPaymentModel = require('../../models/userModel/payment.userModel');

exports.getAllVideos = async (req, res) => {
    try {
        const userPayment = await userPaymentModel.find({ userId: req.user._id }, { category: 1 });
        let paidCategories = userPayment.map(paymentObj => paymentObj.category);

        let videos = await Video.find({}, { __v: 0 }).lean();

        videos = videos.map(video => ({
            ...video,
            thumbnail: video.thumbnail.url,
            video: video.video.url,
            paid: paidCategories.includes(video.category) ? true : false,
        }));

        if (videos.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Video not found!",
            });
        };

        res.status(200).json({
            success: true,
            message: 'All videos fetched successfully...',
            videos,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error occured while fetching the videos',
        });
    };
};

exports.getAllVideosByCategory = async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({
                success: false,
                messagge: 'category is required',
            });
        };
        let videosByCategory = await Video.find({ category }, { __v: 0 }).lean();        

        const Categories = await userPaymentModel.find(
            { userId: req.user._id, category },
            { category: 1, _id: 0 },
        );
        const paidCategories = Categories.map(doc => doc.category);

        videosByCategory = videosByCategory.map(video => ({
            ...video,
            thumbnail: video.thumbnail.url,
            video: video.video.url,
            paid: paidCategories.includes(video.category) ? true : false,
        }));

        if (videosByCategory.length === 0) {
            return res.status(404).json({
                success: true,
                message: "videos not found!",
            });
        };
        res.status(200).json({
            success: true,
            message: "Video fetched By category successfully...",
            videosByCategory,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error occured while fetching the videos by category',
        });
    };
};

// like a video
exports.likeVideo = async (req, res) => {
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

        res.status(200).json({ success: true, like });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    };
};

// comment a video
exports.addComment = async (req, res) => {
    try {
        const { videoId } = req.query || req.body;
        const { content } = req.body;
        const userId = req.user._id;

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

        video.comments.push({ userId, content });
        await video.save();

        res.status(201).json({ success: true, message: 'Comment added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    };
};

exports.getAllComments = async (req, res) => {
    try {
        const { videoId } = req.query || req.body;

        const video = await Video.findById(videoId).select('comments');
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Comment fetched successfully...',
            comments: video.comments,
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
        });
    };
};

exports.editComment = async (req, res) => {
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

        res.status(200).json({
            success: true,
            message: 'Comment updated successfully',
            comment,
        });
    } catch (error) {
        console.error('Error editing comment:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
        });
    };
};

exports.deleteComment = async (req, res) => {
    try {
        const { videoId, commentId } = req.body || req.query;

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

        const commentIndex = video.comments.findIndex(comment => comment._id.toString() === commentId);
        if (commentIndex === -1) return res.status(404).json({ success: false, message: 'Comment not found' });

        video.comments.splice(commentIndex, 1);
        await video.save();

        res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    };
};
