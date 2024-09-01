const Article = require('../../models/adminModel/article.adminModel');

exports.createArticle = async (req, res) => {
    try {
        const articleData = {
            userId: req.admin._id,
            ...req.body,
        };
        
        const article = new Article(articleData);
        await article.save();

        res.status(200).json({
            success: true,
            message: "Article created successfully...",
            article,
        });

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: `Article already exists!`,
            });
        };
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getAllArticles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const skip = (page - 1) * limit;

        const articls = await Article.find({}).skip(skip).limit(limit);
        const totalArticles = await Article.countDocuments();

        if (!articls) {
            return res.status(404).json({
                success: false,
                message: 'Article not found!',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Article fetched successfully...',
            articls,
            totalArticles,
            page,
            totalPages: Math.ceil(totalArticles / limit),
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
        const { articleId } = req.query || req.body;

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
    try {
        const { articleId } = req.query || req.body;

        const article = await Article.findByIdAndUpdate(
            articleId,
            req.body,
            { new: true, runValidators: true }
        );
        if (!article) {
            return res.status(404).json({
                success: true,
                message: 'Article not found!',
            });
        };

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
        const { articleId } = req.query || req.body;

        const article = await Article.findByIdAndDelete(articleId);
        if (!article) {
            return res.status(404).json({
                success: true,
                message: 'Article not found!',
            });
        };
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