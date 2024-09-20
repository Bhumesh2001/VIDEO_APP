const Category = require('../../models/adminModel/category.adminModel');
const {
    deleteImageOnCloudinary,
    uploadImageToCloudinary,
    deleteImageAndUploadToCloudinary
} = require('../../utils/uploadImage');

exports.createCategory = async (req, res) => {
    try {
        let { name, description, status, image } = req.body;

        if (req.files && req.files.image) {
            image = req.files.image.tempFilePath;
        } else if (!(image && /^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image URL!',
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'error occured while validating the image or image_url',
            });
        };

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: 'Category already exists.',
            });
        };

        const tempCategory = new Category({
            name,
            description,
            status,
        });

        const validationError = tempCategory.validateSync();
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: Object.values(validationError.errors).map(err => err.message),
            });
        };

        let public_id = '';
        let image_url = '';
        if (req.files && req.files.image) {
            const imageData = await uploadImageToCloudinary(image);
            public_id = imageData.public_id;
            image_url = imageData.url;
        } else if (image) {
            const imageData = await uploadImageToCloudinary(image);
            public_id = imageData.public_id;
            image_url = imageData.url;
        };

        const category = new Category({
            name,
            description,
            public_id,
            image_url,
            status,
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully.',
            category,
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating the category.',
        });
    };
};

exports.getAllCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const skip = (page - 1) * limit;

        const categories = await Category.find({}, { __v: 0, createdAt: 0, updatedAt: 0 })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const totalCategory = await Category.countDocuments();

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Article not found!',
            });
        };

        res.status(200).json({
            success: true,
            message: "All categories fetched successfully...",
            totalCategory,
            totalPages: Math.ceil(totalCategory / limit),
            page,
            categories,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: true,
            message: "error occured during fetching the category",
        });
    };
};

exports.getCategory = async (req, res) => {
    try {
        const { categoryId } = req.query;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: true,
                message: 'category not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: "category fetched successfully...",
            category,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: true,
            message: "error occured during fetching the category",
        });
    };
};

exports.updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.query;
        let { name, description, status, image } = req.body;

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

        const categoryData = await Category.findById(categoryId);
        if (!categoryData) {
            return res.status(404).json({
                success: false,
                message: 'Category not found!',
            });
        };

        const public_id = categoryData.public_id;
        const imageData = await deleteImageAndUploadToCloudinary(public_id, image);

        const updates = {
            name,
            description,
            public_id: imageData.public_id,
            image_url: imageData.url,
            status,
        };

        const category = await Category.findByIdAndUpdate(
            categoryId,
            { ...updates, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                success: true,
                message: "category not found",
            });
        };
        await category.save();

        res.status(200).json({
            success: true,
            message: "Category updated successfully...",
            category,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: true,
            message: "error occured during update the category",
        });
    };
};

exports.deleteCategories = async (req, res) => {
    try {
        const { categoryId } = req.query;

        const category = await Category.findByIdAndDelete(categoryId);
        if (!category) {
            return res.status(404).json({
                success: true,
                message: "category not found",
            });
        };

        const public_id = category.public_id;
        deleteImageOnCloudinary(public_id);

        res.status(200).json({
            success: true,
            message: "category deleted successfully...",
            category,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: true,
            message: "error occured while during the category",
        });
    };
};