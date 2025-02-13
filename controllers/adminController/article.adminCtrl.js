const Article = require('../../models/adminModel/article.adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createArticle = async (req, res, next) => {
    try {
        const { title, description } = req.body;

        // Upload image to Cloudinary if provided
        let imageData = { url: null, public_id: null };
        if (req.file) {
            const data = await uploadImageOnCloudinary(req.file.path, 'VleArticles');
            imageData.url = data.secure_url;
            imageData.public_id = data.public_id;
        }

        // Create article
        const articleData = {
            userId: req.admin?._id, // Ensure req.admin exists
            title,
            description,
            image: imageData.url,
            public_id: imageData.public_id,
        };

        const article = new Article(articleData);
        await article.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            status: 201,
            message: 'Article created successfully!',
            article,
        });
    } catch (error) {
        next(error);
    }
};

exports.getAllArticles = async (req, res, next) => {
    try {
        // Validate and parse pagination parameters
        const page = Math.max(1, parseInt(req.query.page)) || 1;
        const limit = Math.max(1, parseInt(req.query.limit)) || 12;
        const skip = (page - 1) * limit;

        // Fetch articles and total count in parallel
        const [articles, totalArticles] = await Promise.all([
            Article.find({})
                .select('title description image userId likes comments') // Include only necessary fields
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Article.countDocuments(), // No need for .lean() here
        ]);

        // Return response
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Articles fetched successfully!',
            totalArticles,
            totalPages: Math.ceil(totalArticles / limit),
            page,
            articles,
        });
    } catch (error) {
        next(error);
    }
};

exports.getSingleArticle = async (req, res, next) => {
    try {
        const { articleId } = req.query;

        // Fetch article with specific fields
        const article = await Article.findById(articleId)
            .select('-createdAt -updatedAt -__v -public_id') // Exclude unnecessary fields
            .lean();

        if (!article) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Article not found!',
            });
        }

        // Return response
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Article fetched successfully!',
            article,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateArticle = async (req, res, next) => {
    const { articleId } = req.query;
    const { title, description, status } = req.body;
    let imageData = { url: null, public_id: null };

    try {
        // Find the article
        const article = await Article.findById(articleId).lean();
        if (!article) {
            return res.status(404).json({ success: false, status: 404, message: 'Article not found!' });
        }

        // Upload image if file or URL is provided
        if (req.file) {
            if (article.public_id) await deleteImageOnCloudinary(article.public_id);
            const data = await uploadImageOnCloudinary(req.file.path, 'VleArticles');
            imageData.url = data.secure_url;
            imageData.public_id = data.public_id;
        };

        // Update article data
        const updatedArticle = await Article.findByIdAndUpdate(
            articleId,
            {
                title: title || article.title,
                description: description || article.description,
                image: imageData?.url || article.image,
                public_id: imageData?.public_id || article.public_id,
                status: status ? status : article.status,
            },
            { new: true, runValidators: true }
        );

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Article updated successfully...',
            article: updatedArticle,
        });
    } catch (error) {
        next(error);
    };
};

exports.deleteArticle = async (req, res, next) => {
    try {
        const { articleId } = req.query;

        const article = await Article.findByIdAndDelete(articleId);
        if (!article) {
            return res.status(404).json({ success: false, status: 404, message: 'Article not found!' });
        }

        // Delete the associated image from Cloudinary
        if (article.public_id) {
            await deleteImageOnCloudinary(article.public_id);
        }

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Article deleted successfully...',
            article,
        });
    } catch (error) {
        next(error);
    };
};
