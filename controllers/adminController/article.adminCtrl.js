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
        if (!articleId) {
            return res.status(400).json({ success: false, message: "Article ID is required!" });
        }

        // 🔹 Find existing article
        const existingArticle = await Article.findById(articleId);
        if (!existingArticle) {
            return res.status(404).json({ success: false, message: "Article not found!" });
        }

        // 🔹 Initialize Busboy
        const bb = busboy({ headers: req.headers });

        let updatedData = {
            title: existingArticle.title,
            description: existingArticle.description,
            status: existingArticle.status,
            image: existingArticle.image,
            public_id: existingArticle.public_id,
        };

        let fileUploadPromises = [];
        let isFileUploaded = false;

        // ✅ Handle text fields
        bb.on("field", (name, value) => {
            if (["title", "description", "status"].includes(name)) updatedData[name] = value;
        });

        // ✅ Handle file uploads
        bb.on("file", (name, file, info) => {
            if (!info.filename) {
                file.resume(); // ✅ Drain the empty file
                return;
            }

            if (name === "image") {
                isFileUploaded = true;
                fileUploadPromises.push(
                    uploadImageOnCloudinary(file, "VleArticles").then(async (data) => {
                        // ✅ Delete old image if new image uploaded successfully
                        if (existingArticle.public_id) {
                            await deleteImageOnCloudinary(existingArticle.public_id);
                        }
                        updatedData.image = data.secure_url;
                        updatedData.public_id = data.public_id;
                    }).catch((err) => console.error("File Upload Error:", err))
                );
            }
        });

        // ✅ When all files & fields are processed
        bb.on("finish", async () => {
            try {
                await Promise.all(fileUploadPromises); // ✅ Ensure all uploads complete

                // ✅ Update article with new or existing data
                const updatedArticle = await Article.findByIdAndUpdate(
                    articleId,
                    updatedData,
                    { new: true, runValidators: true }
                );

                // ✅ Clear cache for fresh data
                clearCache("node-cache");

                // ✅ Send success response
                res.status(200).json({
                    success: true,
                    message: "Article updated successfully!",
                    article: updatedArticle,
                });

            } catch (error) {
                next(error);
            }
        });

        req.pipe(bb); // ✅ Ensure Busboy processes the request

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
