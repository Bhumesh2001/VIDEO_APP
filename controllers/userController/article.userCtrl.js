const busboy = require("busboy");
const Article = require('../../models/adminModel/article.adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');
const { validateFile } = require("../../utils/validateUtil");

exports.createArticle = async (req, res, next) => {
    try {
        const bb = busboy({ headers: req.headers });

        let articleData = {
            userId: req.user._id,
            title: "",
            description: "",
            image: "", 
            public_id: "",
        };

        let fileUploadPromise = Promise.resolve();
        let isImageUploaded = false;

        let formFieldsPromise = new Promise((resolve, reject) => {
            let formFieldsReceived = false;

            // ✅ Extract and validate form fields
            bb.on("field", async (fieldname, value) => {
                formFieldsReceived = true;

                if (fieldname === "title") articleData.title = value;
                if (fieldname === "description") articleData.description = value;

                if (articleData.title && articleData.description) {
                    // ✅ Check if article already exists
                    const existingArticle = await Article.findOne({ title: articleData.title }).lean();
                    if (existingArticle) {
                        return reject({ success: false, message: "Article with this title already exists!" });
                    }
                }
            });

            bb.on("finish", () => {
                if (!formFieldsReceived) {
                    reject({ success: false, message: "Title and description are required!" });
                } else {
                    resolve();
                }
            });
        });

        // ✅ Handle file upload & validation
        bb.on("file", (fieldname, file, info) => {
            if (fieldname === "image") {
                isImageUploaded = true;

                // ✅ Validate file before uploading
                const validation = validateFile(info);
                if (!validation.valid) {
                    return res.status(400).json({ success: false, message: validation.message });
                }

                fileUploadPromise = uploadImageOnCloudinary(file, "VleArticles").then((data) => {
                    articleData.image = data.secure_url;
                    articleData.public_id = data.public_id;
                });
            }
        });

        // ✅ Process form data before image upload
        req.pipe(bb);

        await formFieldsPromise; // Ensure fields are valid before proceeding

        if (!isImageUploaded) {
            return res.status(400).json({ success: false, message: "Image is required!" });
        }

        await fileUploadPromise; // Ensure image upload is done

        // ✅ Save to DB
        const article = await Article.create(articleData);

        // ✅ Clear Cache
        clearCache("node-cache");

        res.status(201).json({
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
        const result = await Article.aggregate([
            {
                $sort: { createdAt: -1 } // Sort by creation date, descending
            },
            {
                $facet: {
                    articles: [
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
                                createdAt: 1 // Optional
                            }
                        }
                    ],
                    total: [{ $count: "count" }]
                }
            }
        ]);

        const articles = result[0].articles;
        const totalArticles = result[0].total[0]?.count || 0;

        if (articles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Articles not found!',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Articles fetched successfully...',
            totalArticles,
            articles
        });
    } catch (error) {
        next(error);
    }
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
    try {
        const { articleId } = req.query;
        if (!articleId) {
            return res.status(400).json({ success: false, message: "Article ID is required!" });
        }

        // ✅ Check if the article exists
        const existingArticle = await Article.findOne({ userId: req.user._id, _id: articleId }).lean();
        if (!existingArticle) {
            return res.status(404).json({ success: false, message: "Article not found!" });
        }

        const bb = busboy({ headers: req.headers });

        let updatedArticleData = {
            title: existingArticle.title,
            description: existingArticle.description,
            image: existingArticle.image, 
            public_id: existingArticle.public_id ,
        };

        let fileUploadPromise = Promise.resolve();

        let formFieldsPromise = new Promise((resolve, reject) => {
            let formFieldsReceived = false;

            // ✅ Extract and validate form fields
            bb.on("field", async (fieldname, value) => {
                formFieldsReceived = true;
                if (fieldname === "title") updatedArticleData.title = value;
                if (fieldname === "description") updatedArticleData.description = value;
            });

            bb.on("finish", () => {
                if (!formFieldsReceived) {
                    reject({ success: false, message: "Title or description is required!" });
                } else {
                    resolve();
                }
            });
        });

        // ✅ Handle file upload & validation
        bb.on("file", (fieldname, file, info) => {
            if (fieldname === "image") {
                isImageUploaded = true;

                // ✅ Validate file before uploading
                const validation = validateFile(info);
                if (!validation.valid) {
                    return res.status(400).json({ success: false, message: validation.message });
                }

                fileUploadPromise = (async () => {
                    // ✅ Delete old image if exists
                    if (existingArticle.public_id) {
                        await deleteImageOnCloudinary(existingArticle.public_id);
                    }

                    // ✅ Upload new image
                    const data = await uploadImageOnCloudinary(file, "VleArticles");
                    updatedArticleData.image = data.secure_url;
                    updatedArticleData.public_id = data.public_id;
                })();
            }
        });

        // ✅ Process form data before image upload
        req.pipe(bb);

        await formFieldsPromise; // Ensure fields are valid before proceeding
        await fileUploadPromise; // Wait for image upload completion

        // ✅ Update article in DB
        const updatedArticle = await Article.findOneAndUpdate(
            { userId: req.user._id, _id: articleId },
            updatedArticleData,
            { new: true, runValidators: true }
        );

        // ✅ Clear Cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: "Article updated successfully!",
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
