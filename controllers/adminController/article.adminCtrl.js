const Article = require('../../models/adminModel/article.adminModel');
const { deleteImageOnCloudinary } = require('../../utils/uploadImage');
const { uploadImage } = require('../../utils/uploadUtil');
const fs = require('fs').promises;

const articleOptions = {
    folder: 'Articles',
    transformation: [
        { width: 1200, height: 1200, crop: 'fill' }
    ]
};

exports.createArticle = async (req, res) => {
    let imageData = null;

    try {
        const { title, description, image } = req.body;

        // Check for existing article
        const existingArticle = await Article.findOne({ title });
        if (existingArticle) {
            return res.status(409).json({ success: false, message: 'Article already exists!' });
        }

        // Validate image input
        if (!(req.files && req.files.image) && !image) {
            return res.status(400).json({ success: false, message: 'Image file or image URL is required!' });
        }

        // Handle image input (file or URL)
        const imagePath = req.files?.image ? req.files.image.tempFilePath : image;
        if (image && !/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image)) {
            return res.status(400).json({ success: false, message: 'Invalid image URL!' });
        }

        // Upload image to Cloudinary if provided
        if (imagePath) {
            imageData = await uploadImage(imagePath, articleOptions);
            if (req.files?.image) await fs.unlink(req.files.image.tempFilePath);
        }

        const articleData = {
            userId: req.admin._id,
            title,
            description,
            image: imageData.url,
            public_id: imageData.public_id,
        };

        const article = new Article(articleData);
        await article.save();

        res.status(201).json({ success: true, message: "Article created successfully...", article });

    } catch (error) {
        console.error(error);

        // Delete image on Cloudinary if upload was successful but other errors occurred
        if (imageData?.public_id) await deleteImageOnCloudinary(imageData.public_id);

        // Validation error handling
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation Error', errors: validationErrors });
        }

        // Handle duplicate error (11000 for MongoDB unique constraint violations)
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Article already exists!' });
        }

        // Default server error
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

exports.getAllArticles = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 12);
        const skip = (page - 1) * limit;

        const [articles, totalArticles] = await Promise.all([
            Article.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Article.countDocuments()
        ]);

        if (!articles.length) {
            return res.status(404).json({ success: false, message: 'No articles found!' });
        }

        res.status(200).json({
            success: true,
            message: 'Articles fetched successfully...',
            totalArticles,
            totalPages: Math.ceil(totalArticles / limit),
            page,
            articles,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching articles',
            error: error.message,
        });
    }
};

exports.getSingleArticle = async (req, res) => {
    try {
        const { articleId } = req.query;

        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Article fetched successfully...',
            article,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching the article',
            error: error.message,
        });
    }
};

exports.updateArticle = async (req, res) => {
    const { articleId } = req.query;
    const { title, description, image } = req.body;
    let imageFile, imageData;

    try {
        // Find the article
        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({ success: false, message: 'Article not found!' });
        }

        // Handle image file or image URL
        if (req.files?.image) {
            imageFile = req.files.image.tempFilePath;
        } else if (image && /^(https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff))$/i.test(image)) {
            imageFile = image; // Treat URL as file input
        } else if (image) {
            return res.status(400).json({ success: false, message: 'Invalid image URL!' });
        }

        // Upload image if file or URL is provided
        if (imageFile) {
            if (article.public_id) await deleteImageOnCloudinary(article.public_id);
            imageData = await uploadImage(imageFile, articleOptions);
            if (req.files?.image) await fs.unlink(req.files.image.tempFilePath);
        };

        // Update article data
        const updatedArticle = await Article.findByIdAndUpdate(
            articleId,
            {
                title: title || article.title,
                description: description || article.description,
                image: imageData?.url || article.image,
                public_id: imageData?.public_id || article.public_id,
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Article updated successfully...',
            article: updatedArticle,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error updating article', error: error.message });
    }
};

exports.deleteArticle = async (req, res) => {
    try {
        const { articleId } = req.query;

        const article = await Article.findByIdAndDelete(articleId);
        if (!article) {
            return res.status(404).json({ success: false, message: 'Article not found!' });
        }

        // Delete the associated image from Cloudinary
        if (article.public_id) {
            await deleteImageOnCloudinary(article.public_id);
        }

        res.status(200).json({
            success: true,
            message: 'Article deleted successfully...',
            article,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while deleting the article',
            error: error.message,
        });
    }
};
