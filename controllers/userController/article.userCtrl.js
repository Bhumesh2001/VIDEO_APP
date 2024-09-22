const Article = require('../../models/adminModel/article.adminModel');
const {
    deleteImageAndUploadToCloudinary,
    deleteImageOnCloudinary,
} = require('../../utils/uploadImage');

const { uploadImage } = require('../../utils/uploadUtil');
const fs = require('fs').promises;

const articleOptions = {
    folder: 'Articles',
    transformation: [
        { width: 1200, height: 1200, crop: 'fill' }
    ]
};

exports.createArticle = async (req, res) => {
    const { title, description, image } = req.body;
    let imageData = { public_id: '', url: '' };

    try {
        // Check if the article with the same title already exists
        const existingArticle = await Article.findOne({ title });
        if (existingArticle) {
            return res.status(409).json({
                success: false,
                message: 'Article already exists!',
            });
        };

        // Handle file-based image upload
        if (req.files && req.files.image) {
            const imageFilePath = req.files.image.tempFilePath;
            imageData = await uploadImage(imageFilePath, articleOptions);

            // Delete temp file after upload
            await fs.unlink(req.files.image.tempFilePath);
        }
        // Handle URL-based image upload
        else if (image && /^(https?:\/\/.*\.(?:jpg|jpeg|png|gif|webp|bmp|tiff))$/i.test(image)) {
            imageData.url = image;  // Use the image URL directly
        }
        // Invalid image input
        else {
            return res.status(400).json({
                success: false,
                message: 'Valid image file or URL is required!',
            });
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

        res.status(200).json({
            success: true,
            message: "Article created successfully!",
            article,
        });

    } catch (error) {
        console.error(error);

        // Cleanup: Remove the image from Cloudinary if article creation fails
        if (imageData.public_id) {
            await deleteImageOnCloudinary(imageData.public_id);
        }

        // Validation error handling
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        }

        // Handle unique constraint violation (duplicate title)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Article with this title already exists!',
            });
        }

        // Server error
        return res.status(500).json({
            success: false,
            message: 'Server error occurred while creating the article.',
            error: error.message,
        });
    }
};

exports.getAllArticles = async (req, res) => {
    try {
        const articles = await Article.aggregate([
            {
                $project: {
                    userId: 1,
                    title: 1,
                    authorName: 1,
                    publicationDate: 1,
                    content: 1,
                    topic: 1,
                    image: 1,
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
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while fetching the articles',
            error: error.message,
        });
    };
};

exports.getSingleArticle = async (req, res) => {
    try {
        const { articleId } = req.query;

        const article = await Article.findById(articleId);
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
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while fetching the articles',
            error: error.message,
        });
    };
};

exports.updateArticle = async (req, res) => {
    const { articleId } = req.query;
    let { title, description, image, } = req.body;

    try {
        const article_ = await Article.findById(articleId);
        if (!article_) {
            return res.status(404).json({
                success: false,
                message: 'Article not found',
            });
        };

        if (!(req.files && req.files.image) && !req.body.image) {
            return res.status(400).json({
                success: false,
                message: 'Image file or image URL is required!',
            });
        };

        if (req.files && req.files.image) {
            image = req.files.image.tempFilePath;
        } else {
            if (!/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image URL!',
                });
            };
        };

        const public_id = article_.public_id;
        const imageData = await deleteImageAndUploadToCloudinary(public_id, image);

        const updates = {
            title,
            description,
            public_id: imageData.public_id,
            image: imageData.url,
        };

        const article = await Article.findOneAndUpdate(
            { userId: req.user._id, _id: articleId },
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Article updated successfully...',
            article,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while fetching the articles',
            error: error.message,
        });
    };
};

exports.deleteArticle = async (req, res) => {
    try {
        const { articleId } = req.query;

        const article = await Article.findOneAndDelete({ userId: req.user._id, _id: articleId });
        if (!article) {
            return res.status(404).json({
                success: true,
                message: 'Article not found!',
            });
        };

        const public_id = article.public_id;
        deleteImageOnCloudinary(public_id);

        res.status(200).json({
            success: true,
            message: 'Article delete successfully...',
            article,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while deleting the articles',
            error: error.message,
        });
    };
};

// like an article
exports.likeArticle = async (req, res) => {
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
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error liking/unliking article',
            error: error.message
        });
    };
};

// comment an article
exports.addComment = async (req, res) => {
    const { articleId } = req.query || req.body;
    const { content } = req.body;
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

        res.status(201).json({
            success: true,
            message: 'comments added successfully...',
            comments: article.comments,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding comment',
            error: error.message
        });
    };
};

exports.getAllComments = async (req, res) => {
    const { articleId } = req.query || req.body;

    try {
        const article = await Article.findById(articleId).select('comments');

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found.'
            });
        };

        res.status(200).json({
            success: true,
            message: 'comments fetched successfully...',
            comments: article.comments,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving comments.',
            error: error.message
        });
    };
};

exports.editComment = async (req, res) => {
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

        res.status(200).json({
            success: true,
            message: 'Comment updated successfully.',
            article
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the comment.',
            error: error.message
        });
    };
};

exports.deleteComment = async (req, res) => {
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

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully.',
            article
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the comment.',
            error: error.message
        });
    };
};

