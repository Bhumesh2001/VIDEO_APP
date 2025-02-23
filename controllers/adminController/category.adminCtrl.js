const busboy = require("busboy");
const Category = require('../../models/adminModel/category.adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createCategory = async (req, res, next) => {
    try {
        let { name } = req.body;

        // Check for existing category
        if (await Category.findOne({ name }).lean()) {
            return res.status(409).json({
                success: false,
                message: "Category already exists."
            });
        }

        let imageData = { url: null, public_id: null };

        // Handle file upload with Busboy
        const bb = busboy({ headers: req.headers });

        let fileUploadPromise = new Promise((resolve, reject) => {
            let fileProcessed = false;

            bb.on("file", async (name, file, info) => {
                try {
                    fileProcessed = true;

                    // Upload image to Cloudinary
                    const data = await uploadImageOnCloudinary(file, "VleCategories");
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

        // Create category
        const category = new Category({
            name,
            image_url: imageData.url,
            public_id: imageData.public_id,
        });
        await category.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            message: "Category created successfully.",
            category,
        });

    } catch (error) {
        next(error);
    }
};

exports.getAllCategories = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 12);
        const skip = (page - 1) * limit;

        const [categories, totalCategory] = await Promise.all([
            Category.find({}, { __v: 0, createdAt: 0, updatedAt: 0, public_id: 0 })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Category.countDocuments()
        ]);

        if (!categories.length) {
            return res.status(404).json({ success: false, status: 404, message: 'No categories found!' });
        }

        res.status(200).json({
            success: true,
            status: 200,
            message: "Categories fetched successfully.",
            totalCategory,
            totalPages: Math.ceil(totalCategory / limit),
            page,
            categories,
        });
    } catch (error) {
        next(error);
    };
};

exports.getCategory = async (req, res, next) => {
    try {
        const { categoryId } = req.query;
        const category = await Category.findById(categoryId)
            .select('-__v -createdAt -updatedAt -public_id')
            .lean();
        if (!category) {
            return res.status(404).json({
                success: true,
                status: 404,
                message: 'category not found!',
            });
        };
        res.status(200).json({
            success: true,
            status: 200,
            message: "category fetched successfully...",
            category,
        });
    } catch (error) {
        next(error);
    };
};

exports.updateCategory = async (req, res, next) => {
    const { categoryId } = req.query;
    let { name, status } = req.body;

    try {
        const categoryData = await Category.findById(categoryId).lean();
        if (!categoryData) {
            return res.status(404).json({ success: false, message: "Category not found!" });
        }

        let updates = {
            name: name || categoryData.name,
            status: status !== undefined ? status : categoryData.status,
            updatedAt: Date.now(),
            image_url: categoryData.image_url,
            public_id: categoryData.public_id,
        };

        // Handle file upload with Busboy
        const bb = busboy({ headers: req.headers });

        let fileUploadPromise = new Promise((resolve, reject) => {
            let fileProcessed = false;

            bb.on("file", async (name, file, info) => {
                try {
                    fileProcessed = true;

                    // Delete old image if exists
                    if (categoryData.public_id) {
                        await deleteImageOnCloudinary(categoryData.public_id);
                    }

                    // Upload new image to Cloudinary
                    const data = await uploadImageOnCloudinary(file, "VleCategories");
                    updates.image_url = data.secure_url;
                    updates.public_id = data.public_id;
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

        // Update category in database
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, updates, {
            new: true,
            runValidators: true,
        });

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: "Category updated successfully...",
            category: updatedCategory,
        });

    } catch (error) {
        next(error);
    }
};

exports.deleteCategories = async (req, res, next) => {
    try {
        const { categoryId } = req.query;

        const category = await Category.findByIdAndDelete(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, status: 404, message: "Category not found" });
        }

        // Delete image from Cloudinary
        if (category.public_id) {
            await deleteImageOnCloudinary(category.public_id);
        }

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: "Category deleted successfully...",
            category,
        });
    } catch (error) {
        next(error);
    };
};

exports.getCategoryOption = async (req, res, next) => {
    try {
        const categoryOptions = await Category.find({ status: 'active' })
            .select('name')
            .sort({ createdAt: -1 })
            .lean();
        if (categoryOptions.length === 0) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Category Option not found!',
            })
        };
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Category option fetched successfully...!',
            totalCategory: categoryOptions.length,
            categoryOptions,
        });
    } catch (error) {
        next(error);
    };
};
