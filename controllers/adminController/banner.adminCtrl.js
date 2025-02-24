const busboy = require("busboy");
const Banner = require('../../models/adminModel/banner.adminModlel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createBanner = async (req, res, next) => {
    try {
        let imageData = { url: null, public_id: null };

        // Handle file upload with Busboy
        const bb = busboy({ headers: req.headers });

        let fileUploadPromise = new Promise((resolve, reject) => {
            let fileProcessed = false;

            bb.on("file", async (name, file, info) => {
                try {
                    fileProcessed = true;

                    // Upload image to Cloudinary
                    const data = await uploadImageOnCloudinary(file, "VleBanners");
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

        // Save new banner to the database
        const newBanner = new Banner({
            image: imageData.url,
            public_id: imageData.public_id,
        });
        await newBanner.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            message: "Banner created successfully",
            banner: newBanner,
        });

    } catch (error) {
        next(error);
    }
};

exports.getAllBanners = async (req, res, next) => {
    try {
        // Validate and parse pagination parameters
        const page = Math.max(1, parseInt(req.query.page, 10)) || 1;
        const limit = Math.max(1, parseInt(req.query.limit, 10)) || 12;
        const skip = (page - 1) * limit;

        // Fetch banners and total count in parallel
        const [banners, totalBanners] = await Promise.all([
            Banner.find({})
                .select('-__v -createdAt -updatedAt -public_id') // Exclude unnecessary fields
                .sort({ publishedAt: -1 }) // Sort by publishedAt in descending order
                .skip(skip)
                .limit(limit)
                .lean(),
            Banner.countDocuments(), // Get total count of banners
        ]);

        // Check if banners exist
        if (!banners.length) {
            return res.status(200).json({
                success: true,
                status: 200,
                message: 'No banners found!',
                totalBanners: 0,
                totalPages: 0,
                page,
                banners: [],
            });
        }

        // Return response
        res.status(200).json({
            success: true,
            status: 200,
            message: 'Banners fetched successfully!',
            totalBanners,
            totalPages: Math.ceil(totalBanners / limit),
            page,
            banners,
        });
    } catch (error) {
        next(error);
    }
};

exports.getSingleBanner = async (req, res, next) => {
    const { bannerId } = req.query;

    try {
        const banner = await Banner.findById(bannerId)
            .select('-createdAt -updatedAt -__v -public_id')
            .lean();
        if (!banner) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Banner not found'
            });
        };
        res.status(200).json({
            success: true,
            status: 200,
            message: 'banner fetched successfully...',
            banner,
        });
    } catch (error) {
        next(error);
    };
};

exports.updateBanner = async (req, res, next) => {
    try {
        const { bannerId } = req.query;
        let { status } = req.body;
        let imageData = {};

        // 🔹 Check if banner exists
        const bannerData = await Banner.findById(bannerId).lean();
        if (!bannerData) {
            return res.status(404).json({ success: false, message: "Banner not found!" });
        }

        const bb = busboy({ headers: req.headers });
        let fileUploadPromise = [];
        let isFileUploaded = false;

        // ✅ Handle text fields
        bb.on("field", (fieldName, value) => {
            if (fieldName === "status") status = value;
        });

        // ✅ Handle file upload (only if a file is provided)
        bb.on("file", (name, file, info) => {
            if (!info.filename) {
                file.resume(); // Drain the file stream
                return;
            }

            isFileUploaded = true;

            fileUploadPromise.push(
                uploadImageOnCloudinary(file, "VleBanners").then(async (data) => {
                    // ✅ Delete old image after successful upload
                    if (bannerData.public_id) {
                        await deleteImageOnCloudinary(bannerData.public_id);
                    }

                    imageData = { url: data.secure_url, public_id: data.public_id };
                }).catch((err) => console.error("File Upload Error:", err))
            );
        });

        // ✅ When all files and fields are processed
        bb.on("finish", async () => {
            try {
                await Promise.all(fileUploadPromise); // ✅ Wait for all uploads

                // ✅ Prepare update object
                const bannerUpdates = {
                    status: status || bannerData.status,
                    updatedAt: Date.now(),
                    image: isFileUploaded ? imageData.url : bannerData.image, // ✅ Use old image if no new file
                    public_id: isFileUploaded ? imageData.public_id : bannerData.public_id,
                };

                // ✅ Update the banner in DB
                const updatedBanner = await Banner.findByIdAndUpdate(bannerId, bannerUpdates, {
                    new: true,
                    runValidators: true,
                });

                // ✅ Clear Cloudinary Cache
                clearCache("node-cache");

                // ✅ Send Response
                res.status(200).json({
                    success: true,
                    message: "Banner updated successfully",
                    banner: updatedBanner,
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

exports.deleteBanner = async (req, res, next) => {
    const { bannerId } = req.query;

    try {
        const banner = await Banner.findByIdAndDelete(bannerId);
        if (!banner) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Banner not found'
            });
        };

        const public_id = banner.public_id;
        if (public_id) await deleteImageOnCloudinary(public_id);

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Banner deleted successfully',
            banner,
        });
    } catch (error) {
        next(error);
    };
};
