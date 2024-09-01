const Article = require('../../models/adminModel/article.adminModel');
const Video = require('../../models/adminModel/video.adminModel');

exports.totalLikesAndComment = async (req, res) => {
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

        const totalLikesAndCommentObj = {
            success: true,
            message: "Total likes and comments fetched successfully...",
            articles: {
                totalLikes: articlesAggregation.length ? articlesAggregation[0].totalLikes : 0,
                totalComments: articlesAggregation.length ? articlesAggregation[0].totalComments : 0,
            },
            videos: {
                totalLikes: videosAggregation.length ? videosAggregation[0].totalLikes : 0,
                totalComments: videosAggregation.length ? videosAggregation[0].totalComments : 0,
            }
        };

        res.status(200).json(totalLikesAndCommentObj);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error fetching total likes and comments',
            error: error.message
        });
    };
};
