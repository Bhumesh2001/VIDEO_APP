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

        const totalArticleLikes = articlesAggregation.length ? articlesAggregation[0].totalLikes : 0;
        const totalVideoLikes = videosAggregation.length ? videosAggregation[0].totalLikes : 0;

        const totalVideoComments = videosAggregation.length ? videosAggregation[0].totalComments : 0;
        const totalArticleComments = articlesAggregation.length ? articlesAggregation[0].totalComments : 0;

        const totalArticleAndVideoLikes = totalArticleLikes + totalVideoLikes;
        const totalArticleAndVideoComments = totalArticleComments + totalVideoComments;


        const totalLikesAndCommentsObj = {
            success: true,
            message: "Total likes and comments fetched successfully...",
            totalArticleAndVideoLikes,
            totalArticleAndVideoComments
        };

        res.status(200).json(totalLikesAndCommentsObj);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error fetching total likes and comments',
            error: error.message
        });
    };
};
