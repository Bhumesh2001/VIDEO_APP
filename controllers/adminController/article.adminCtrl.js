const busboy = require("busboy");
const Article = require('../../models/adminModel/article.adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createArticle = async (req, res, next) => {
    try {
        let articleData = { title: "", description: "", userId: req.admin?._id };
        let imageData = { url: null, public_id: null };
        let articleExists = false;

        // Initialize Busboy
        const bb = busboy({ headers: req.headers });

        let fileUploadPromise = new Promise((resolve, reject) => {
            let fileProcessed = false;

            bb.on("field", (name, value) => {
                if (name === "title" || name === "description") {
                    articleData[name] = value.trim(); // ✅ Trim whitespace
                }

                if (name === "title") {
                    Article.findOne({ title: value }).lean().then((existingArticle) => {
                        if (existingArticle) articleExists = true;
                    }).catch(reject);
                }
            });

            bb.on("file", async (name, file, info) => {
                try {
                    fileProcessed = true;
                    const data = await uploadImageOnCloudinary(file, "VleArticles");
                    imageData.url = data.secure_url;
                    imageData.public_id = data.public_id;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            bb.on("finish", () => {
                if (!fileProcessed) resolve(); // Resolve even if no file was uploaded
            });

            req.pipe(bb);
        });

        await fileUploadPromise; // ✅ Wait for file & field parsing

        // ✅ Validation Check: Title & Description Required
        if (!articleData.title || !articleData.description) {
            return res.status(400).json({
                success: false,
                message: "Title and description are required.",
            });
        }

        // ✅ Check if the article already exists
        if (articleExists) {
            return res.status(409).json({
                success: false,
                message: "Article already exists!",
            });
        }

        // ✅ Create and Save Article
        const article = new Article({
            ...articleData,
            image: imageData.url,
            public_id: imageData.public_id,
        });

        await article.save();

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
    try {
        const { articleId } = req.query;
        let articleData = { title: "", description: "", status: "" };
        let imageData = { url: null, public_id: null };

        // Find the article
        const existingArticle = await Article.findById(articleId);
        if (!existingArticle) {
            return res.status(404).json({ success: false, message: "Article not found!" });
        }

        // Handle file upload with Busboy
        const bb = busboy({ headers: req.headers });

        let fileUploadPromise = new Promise((resolve, reject) => {
            let fileProcessed = false;

            bb.on("field", (name, value) => {
                articleData[name] = value;
            });

            bb.on("file", async (name, file, info) => {
                try {
                    fileProcessed = true;

                    // Delete previous image if it exists
                    if (existingArticle.public_id) {
                        await deleteImageOnCloudinary(existingArticle.public_id);
                    }

                    // Upload new image to Cloudinary
                    const data = await uploadImageOnCloudinary(file, "VleArticles");
                    imageData.url = data.secure_url;
                    imageData.public_id = data.public_id;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            bb.on("finish", () => {
                if (!fileProcessed) resolve(); // Resolve if no file was uploaded
            });

            req.pipe(bb);
        });

        await fileUploadPromise; // Wait for file upload to complete

        // Update article data
        const updatedArticle = await Article.findByIdAndUpdate(
            articleId,
            {
                title: articleData.title || existingArticle.title,
                description: articleData.description || existingArticle.description,
                status: articleData.status || existingArticle.status,
                image: imageData.url || existingArticle.image,
                public_id: imageData.public_id || existingArticle.public_id,
            },
            { new: true, runValidators: true }
        );

        // Clear node-cache
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
