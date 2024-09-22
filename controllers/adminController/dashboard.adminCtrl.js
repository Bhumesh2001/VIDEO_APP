const Article = require('../../models/adminModel/article.adminModel');
const Video = require('../../models/adminModel/video.adminModel');
const User = require('../../models/userModel/userModel');
const Category = require('../../models/adminModel/category.adminModel');

exports.dashboardCount = async (req, res) => {
    try {
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

        const [articleData, videoData] = await Promise.all([
            aggregateData(Article),
            aggregateData(Video),
        ]);

        const totalUser = await User.countDocuments();
        const totalCategory = await Category.countDocuments();
        const totalArticle = await Article.countDocuments();
        const totalVideo = await Video.countDocuments();

        const response = {
            success: true,
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
        console.error('Error fetching dashboard counts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching total likes and comments',
            error: error.message
        });
    }
};
