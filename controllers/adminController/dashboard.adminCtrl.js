const Article = require('../../models/adminModel/article.adminModel');
const Video = require('../../models/adminModel/video.adminModel');
const User = require('../../models/userModel/userModel');
const Category = require('../../models/adminModel/category.adminModel');

exports.dashboardCount = async (req, res) => {
    try {
        const articlesAggregation = await Article.aggregate([
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: { $size: "$likes" } },
                    totalComments: { $sum: { $size: "$comments" } }
                }
            }
        ]);

        const videosAggregation = await Video.aggregate([
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: { $size: "$likes" } },
                    totalComments: { $sum: { $size: "$comments" } }
                }
            }
        ]);

        const totalArticleLikes = articlesAggregation.length ? articlesAggregation[0].totalLikes : 0;
        const totalVideoLikes = videosAggregation.length ? videosAggregation[0].totalLikes : 0;

        const totalVideoComments = videosAggregation.length ? videosAggregation[0].totalComments : 0;
        const totalArticleComments = articlesAggregation.length ? articlesAggregation[0].totalComments : 0;

        const totalArticleAndVideoLikes = totalArticleLikes + totalVideoLikes;
        const totalArticleAndVideoComments = totalArticleComments + totalVideoComments;

        const totalUser = await User.countDocuments();
        const totalCategory = await Category.countDocuments();
        const totalArticle = await Article.countDocuments();
        const totalVideo = await Video.countDocuments();

        const response = {
            success: true,
            message: "Total likes and comments fetched successfully...",
            totalUser,
            totalVideo,
            totalCategory,
            totalArticleAndVideoLikes,
            totalArticleAndVideoComments,
            totalArticle,
        };

        res.status(200).json(response);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error fetching total likes and comments',
            error: error.message
        });
    };
};
