const Article = require('../../models/adminModel/article.adminModel');
const Video = require('../../models/adminModel/video.adminModel');
const User = require('../../models/userModel/userModel');
const Category = require('../../models/adminModel/category.adminModel');

exports.dashboardCount = async (req, res, next) => {
    try {
        // Precompute aggregation data (if not already done)
        const aggregateData = async (model) => {
            const result = await model.aggregate([
                {
                    $group: {
                        _id: null,
                        totalLikes: { $sum: { $size: "$likes" } },
                        totalComments: { $sum: { $size: "$comments" } }
                    }
                }
            ]);
            return result.length ? result[0] : { totalLikes: 0, totalComments: 0 };
        };

        // Run all queries in parallel
        const [articleData, videoData, totalUser, totalCategory, totalArticle, totalVideo] =
            await Promise.all([
                aggregateData(Article),
                aggregateData(Video),
                User.countDocuments(),
                Category.countDocuments(),
                Article.countDocuments(),
                Video.countDocuments(),
            ]);

        // Prepare response
        const response = {
            success: true,
            status: 200,
            message: "Total data fetched successfully...",
            totalUser,
            totalVideo,
            totalCategory,
            totalLikes: articleData.totalLikes + videoData.totalLikes,
            totalComments: articleData.totalComments + videoData.totalComments,
            totalArticle,
        };

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};
