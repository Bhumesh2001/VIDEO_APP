const fs = require('fs').promises;
const Article = require('../../models/adminModel/article.adminModel');
const { uploadImage, deleteImageOnCloudinary } = require('../../utils/uploadUtil');

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
    const { title, description, image } = req.body;

    try {
        // Check if article exists
        const article = await Article.findOne({ userId: req.user._id, articleId }).exec();
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found',
            });
        }

        // Handle image upload (either URL or file)
        let imageData = { url: article.image, public_id: article.public_id }; // Default to existing image
        if (req.files?.image || image) {
            const imageInput = req.files?.image?.tempFilePath || image;

            // Validate image URL if provided
            if (typeof imageInput === 'string' && !/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(imageInput)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image URL!',
                });
            }

            // Delete old image and upload the new one
            if (article.public_id) await deleteImageOnCloudinary(article.public_id);
            imageData = await uploadImage(imageInput, articleOptions);

            // Clean up temporary file if applicable
            if (req.files?.image) await fs.unlink(req.files.image.tempFilePath);
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

        return res.status(200).json({
            success: true,
            message: 'Article updated successfully',
            article: updatedArticle,
        });

    } catch (error) {
        console.error('Error updating article:', error);
        return res.status(500).json({
            success: false,
            message: 'Error occurred while updating the article',
            error: error.message,
        });
    }
};

exports.deleteArticle = async (req, res) => {
    try {
        const { articleId } = req.query;

        // Ensure articleId is provided
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

        res.status(200).json({
            success: true,
            message: 'Article deleted successfully',
            article,
        });
    } catch (error) {
        console.error('Error deleting article:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the article',
            error: error.message,
        });
    }
};

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
            article,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error liking/unliking article',
            error: error.message
        });
    };
};

exports.addComment = async (req, res) => {
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

        res.status(201).json({
            success: true,
            message: 'comments added successfully...',
            article,
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
        // Fetch the article and select the comments
        const article = await Article.findById(articleId).select('comments');

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
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving comments.',
            error: error.message
        });
    }
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
