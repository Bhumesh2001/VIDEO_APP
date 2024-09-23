const fs = require('fs').promises;
const Category = require('../../models/adminModel/category.adminModel');
const { uploadImage, deleteImageOnCloudinary } = require('../../utils/uploadUtil');

const categoryOptions = {
    folder: 'Categories',
    transformation: [
        { width: 1080, height: 1080, crop: 'fill' }
    ],
};

exports.createCategory = async (req, res) => {
    try {
        let { name, description, status, image } = req.body;

        // Handle image upload or URL validation
        if (req.files?.image) {
            image = req.files.image.tempFilePath;
        } else if (image && !/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image)) {
            return res.status(400).json({ success: false, message: 'Invalid image URL!' });
        } else {
            return res.status(400).json({ success: false, message: 'Image or image URL is required!' });
        }

        // Check for existing category
        if (await Category.findOne({ name })) {
            return res.status(409).json({ success: false, message: 'Category already exists.' });
        }

        // Create and validate the category
        const tempCategory = new Category({ name, description, status });
        const validationError = tempCategory.validateSync();
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: Object.values(validationError.errors).map(err => err.message),
            });
        }

        // Upload image if provided
        const imageData = image && await uploadImage(image, categoryOptions);
        const category = new Category({
            name,
            description,
            public_id: imageData.public_id,
            image_url: imageData.url,
            status,
        });

        await category.save();

        res.status(201).json({ success: true, message: 'Category created successfully.', category });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, message: 'An error occurred while creating the category.' });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 12);
        const skip = (page - 1) * limit;

        const [categories, totalCategory] = await Promise.all([
            Category.find({}, { __v: 0, createdAt: 0, updatedAt: 0 })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Category.countDocuments()
        ]);

        if (!categories.length) {
            return res.status(404).json({ success: false, message: 'No categories found!' });
        }

        res.status(200).json({
            success: true,
            message: "Categories fetched successfully.",
            totalCategory,
            totalPages: Math.ceil(totalCategory / limit),
            page,
            categories,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "An error occurred while fetching categories." });
    }
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
    const { categoryId } = req.query;
    let { name, description, status, image } = req.body;

    try {
        const categoryData = await Category.findById(categoryId);
        if (!categoryData) {
            return res.status(404).json({ success: false, message: 'Category not found!' });
        }

        // Validate image
        if (req.files && req.files.image) {
            image = req.files.image.tempFilePath;
        } else if (image && !/^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image)) {
            return res.status(400).json({ success: false, message: 'Invalid image URL!' });
        }

        // Prepare updates
        const updates = {
            name: name || categoryData.name,
            description: description || categoryData.description,
            status: status !== undefined ? status : categoryData.status,
            updatedAt: Date.now(),
        };

        // Handle image upload if provided
        if (image) {
            await deleteImageOnCloudinary(categoryData.public_id);
            const imageData = await uploadImage(image, categoryOptions);
            updates.public_id = imageData.public_id;
            updates.image_url = imageData.url;
            if (req.files.image) await fs.unlink(req.files.image.tempFilePath);
        } else {
            updates.public_id = categoryData.public_id;
            updates.image_url = categoryData.image_url;
        }

        const updatedCategory = await Category.findByIdAndUpdate(categoryId, updates, { new: true, runValidators: true });

        res.status(200).json({
            success: true,
            message: "Category updated successfully...",
            category: updatedCategory,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "An error occurred during category update." });
    }
};

exports.deleteCategories = async (req, res) => {
    try {
        const { categoryId } = req.query;

        const category = await Category.findByIdAndDelete(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // Delete image from Cloudinary
        if (category.public_id) {
            await deleteImageOnCloudinary(category.public_id);
        }

        res.status(200).json({
            success: true,
            message: "Category deleted successfully...",
            category,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error occurred while deleting the category." });
    }
};
