const cloudinary = require('cloudinary').v2;
const validUrl = require('valid-url');

exports.uploadImageToCloudinary = async (filePathOrUrl) => {
    try {
        const result = await cloudinary.uploader.upload(filePathOrUrl, {
            resource_type: "image",
        });
        return {
            public_id: result.public_id,
            url: result.secure_url,
        };
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Failed to upload image');
    };
};

exports.deleteImageAndUploadToCloudinary = async (publicId, image) => {
    try {
        await cloudinary.uploader.destroy(publicId);
        const imageData = this.uploadImageToCloudinary(image);
        return imageData;

    } catch (error) {
        throw new Error(`Error deleting image: ${error.message}`);
    };
};

exports.deleteImageOnCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        throw new Error(`Error deleting image: ${error.message}`);
    };
};

exports.checkUrl = (url) => {
    if (validUrl.isUri(url)) {
        return true;
    } else {
        return false;
    };
};