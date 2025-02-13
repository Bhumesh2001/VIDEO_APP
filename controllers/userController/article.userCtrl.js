const Article = require('../../models/adminModel/article.adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createArticle = async (req, res, next) => {
    const { title, description } = req.body;
    let imageData = { public_id: '', url: '' };

    try {
        // Check if the article with the same title already exists
        const existingArticle = await Article.findOne({ title }).lean();
        if (existingArticle) {
            return res.status(409).json({
                success: false,
                message: 'Article already exists!',
            });
        };

        if (req.file) {
            const data = await uploadImageOnCloudinary(req.file.path, 'VleArticles');
            imageData.url = data.secure_url;
            imageData.public_id = data.public_id;
        }

        // Create the new article
        const articleData = {
            userId: req.user._id,
            title,
            description,
            public_id: imageData.public_id,
            image: imageData.url,
        };

        const article = new Article(articleData);
        await article.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: "Article created successfully!",
            article,
        });
    } catch (error) {
        next(error);
    }
};

exports.getAllArticles = async (req, res, next) => {
    try {
        const articles = await Article.aggregate([
            {
                $project: {
                    userId: 1,
                    title: 1,
                    image: 1,
                    description: 1,
                    TotalLikes: { $size: "$likes" },
                    TotalComments: { $size: "$comments" },
                    likes: 1,
                    comments: 1,
                }
            }
        ]);

        const totalArticles = await Article.countDocuments();
        if (articles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Article not found!',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Article fetched successfully...',
            totalArticles,
            articles
        });
    } catch (error) {
        next(error);
    };
};

exports.getSingleArticle = async (req, res, next) => {
    try {
        const { articleId } = req.query;

        const article = await Article.findById(articleId).sort({ createdAt: -1 });
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Article fetched successfully...',
            article,
        });
    } catch (error) {
        next(error);
    };
};

exports.updateArticle = async (req, res, next) => {
    const { articleId } = req.query;
    const { title, description } = req.body;

    try {
        // Check if article exists
        const article = await Article.findOne({ userId: req.user._id, _id: articleId }).lean().exec();
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found',
            });
        }

        // Handle image upload (either URL or file)
        let imageData = { url: article.image, public_id: article.public_id }; // Default to existing image
        if (req.file) {
            // Delete old image and upload the new one
            if (article.public_id) await deleteImageOnCloudinary(article.public_id);
            const data = await uploadImageOnCloudinary(req.file.path, 'VleArticles');
            imageData.url = data.secure_url;
            imageData.public_id = data.public_id;
        }

        // Build update object dynamically
        const updates = {
            title: title || article.title,
            description: description || article.description,
            image: imageData.url,
            public_id: imageData.public_id,
        };

        // Update article
        const updatedArticle = await Article.findOneAndUpdate(
            { userId: req.user._id, _id: articleId },
            updates,
            { new: true, runValidators: true }
        );

        // Clear node-cache
        clearCache("node-cache");

        return res.status(200).json({
            success: true,
            message: 'Article updated successfully',
            article: updatedArticle,
        });

    } catch (error) {
        next(error);
    }
};

exports.deleteArticle = async (req, res, next) => {
    try {
        const { articleId } = req.query;
        if (!articleId) {
            return res.status(400).json({
                success: false,
                message: 'Article ID is required',
            });
        }

        // Find and delete the article
        const article = await Article.findOneAndDelete({ userId: req.user._id, _id: articleId });
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found!',
            });
        }

        // If the article has a public_id, delete the image on Cloudinary
        if (article.public_id) {
            try {
                await deleteImageOnCloudinary(article.public_id);
            } catch (err) {
                console.error('Error deleting image from Cloudinary:', err);
            }
        }

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Article deleted successfully',
            article,
        });
    } catch (error) {
        next(error);
    }
};

exports.likeArticle = async (req, res, next) => {
    const { articleId } = req.query || req.body;
    const userId = req.user._id;

    try {
        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        };

        let like;
        if (article.likes.includes(userId)) {
            article.likes.pull(userId);
            like = false;
        } else {
            article.likes.push(userId);
            like = true;
        };

        await article.save();
        res.status(200).json({
            success: true,
            likes: article.likes.length,
            like,
            article,
        });
    } catch (error) {
        next(error);
    };
};

exports.addComment = async (req, res, next) => {
    const { articleId, content } = req.body;
    const userId = req.user._id;

    try {
        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        };

        const comment = {
            userId,
            content,
        };

        article.comments.push(comment);
        await article.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            message: 'comments added successfully...',
            article,
        });
    } catch (error) {
        next(error);
    };
};

exports.getAllComments = async (req, res, next) => {
    const { articleId } = req.query || req.body;

    try {
        // Fetch the article and select the comments
        const article = await Article.findById(articleId).select('comments').lean();
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found.'
            });
        }

        // Sort comments by creation date (assuming comments have a 'createdAt' field)
        const sortedComments = article.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            success: true,
            message: 'Comments fetched successfully...',
            comments: sortedComments,
        });
    } catch (error) {
        next(error);
    }
};

exports.editComment = async (req, res, next) => {
    const { articleId, commentId, content } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Content is required and cannot be empty.'
        });
    };

    try {
        const article = await Article.findOneAndUpdate(
            { _id: articleId, 'comments._id': commentId },
            { $set: { 'comments.$.content': content, updatedAt: Date.now() } },
            { new: true },
        );

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article or comment not found.'
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Comment updated successfully.',
            article
        });
    } catch (error) {
        next(error);
    };
};

exports.deleteComment = async (req, res, next) => {
    const { articleId, commentId } = req.body || req.query;

    try {
        const article = await Article.findByIdAndUpdate(
            articleId,
            { $pull: { comments: { _id: commentId } } },
            { new: true }
        );

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article or comment not found.'
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully.',
            article
        });
    } catch (error) {
        next(error);
    };
};
