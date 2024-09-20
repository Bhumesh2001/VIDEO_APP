const Article = require('../../models/adminModel/article.adminModel');
const cloudinary = require('cloudinary').v2;
const {
    deleteImageAndUploadToCloudinary,
    deleteImageOnCloudinary,
    imageToBuffer,
    uploadArticleImageToCloudinary,
    resizeImage,
} = require('../../utils/uploadImage');

exports.createArticle = async (req, res) => {
    let imageData = null;
    try {
        let { title, description, image } = req.body;

        // Check for existing article
        const existingArticle = await Article.findOne({ title });
        if (existingArticle) {
            return res.status(409).json({
                success: false,
                message: 'Article already exists!',
            });
        };

        // Validate image
        if (!(req.files && req.files.image) && !image) {
            return res.status(400).json({
                success: false,
                message: 'Image file or image URL is required!',
            });
        };

        // Handle file upload or image URL
        if (req.files && req.files.image) {
            image = req.files.image.tempFilePath;
        } else if (image && !/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image URL!',
            });
        };

        // Upload image to Cloudinary
        if (image) {
            const aspect_ratio = {
                height: 1200,
                width: 1200
            };
            const folderName = 'Articles';
            const format = req.files.image.mimetype.split('/')[1];

            const imageBuffer = await imageToBuffer(image);
            const resizedBuffer = await resizeImage(imageBuffer, aspect_ratio.width, aspect_ratio.height);

            imageData = await uploadArticleImageToCloudinary(resizedBuffer, format, aspect_ratio, folderName);
        };

        const articleData = {
            userId: req.admin._id,
            title,
            description,
            image: imageData.url,
            public_id: imageData.public_id,
        };

        const article = new Article(articleData);
        await article.save();

        res.status(201).json({
            success: true,
            message: "Article created successfully...",
            article,
        });

    } catch (error) {
        console.error(error);

        if (imageData && imageData.public_id) {
            try {
                await cloudinary.uploader.destroy(imageData.public_id, {
                    resource_type: 'image',
                });
            } catch (cleanupError) {
                console.error('Error deleting image from Cloudinary:', cleanupError);
            };
        };

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
        }

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

        const articls = await Article.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
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
            totalArticles,
            totalPages: Math.ceil(totalArticles / limit),
            page,
            articls,
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
        let { title, description, image } = req.body;

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

        const dataToUpdate = {
            title,
            description,
        };

        if(image){
            const aspect_ratio = {
                height: 1200,
                width: 1200
            };
            const folderName = 'Articles';
            const format = req.files.image.mimetype.split('/')[1];
    
            const imageBuffer = await imageToBuffer(image);
            const resizedBuffer = await resizeImage(imageBuffer, aspect_ratio.width, aspect_ratio.height);
    
            const public_id = articleData.public_id;
            const updateData = { resizedBuffer, format, aspect_ratio, folderName, public_id }
            const imageData = await deleteImageAndUploadToCloudinary(updateData);

            dataToUpdate['image'] = imageData.url;
            dataToUpdate['public_id'] = imageData.public_id;
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