const Article = require('../../models/adminModel/article.adminModel');
const {
    uploadImageToCloudinary,
    deleteImageAndUploadToCloudinary,
    deleteImageOnCloudinary,
} = require('../../utils/uploadImage');

const { convertToMongooseDate } = require('../../utils/subs.userUtil');

exports.createArticle = async (req, res) => {
    try {
        let { title_, authorName_, publicationDate_, topic_, content_, image_, } = req.body;

        const existingArticle = await Article.findOne({ title: title_ });
        if (existingArticle) {
            return res.status(409).json({
                success: false,
                message: 'Article already exists!',
            });
        };

        if (!(req.files && req.files.image_) && !req.body.image_) {
            return res.status(400).json({
                success: false,
                message: 'Image file or image URL is required!',
            });
        };

        if (req.files && req.files.image_) {
            image_ = req.files.image_.tempFilePath;
        } else {
            if (!/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image_)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image URL!',
                });
            };
        };

        const imageData = await uploadImageToCloudinary(image_);

        const articleData = {
            userId: req.admin._id,
            title: title_,
            public_id: imageData.public_id,
            image: imageData.url,
            publicationDate: convertToMongooseDate(publicationDate_),
            authorName: authorName_,
            topic: topic_,
            content: content_,
        };

        const article = new Article(articleData);
        await article.save();

        res.status(201).json({
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
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Article already exists!',
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
    try {
        const { articleId } = req.query;
        let { image, publicationDate, ...data } = req.body;

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

        const articleData = await Article.findById(articleId);
        if (!articleData) {
            return res.status(404).json({
                success: false,
                message: 'Article not found!',
            });
        };

        const public_id = articleData.public_id;
        const imageData = await deleteImageAndUploadToCloudinary(public_id, image);

        const dataToUpdate = {
            public_id: imageData.public_id,
            image: imageData.url,
            publicationDate: publicationDate ? new Date(publicationDate) : new Date(),
            ...data,
        };

        const article = await Article.findByIdAndUpdate(
            articleId,
            dataToUpdate,
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
        const { articleId } = req.query;

        const article = await Article.findByIdAndDelete(articleId);
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