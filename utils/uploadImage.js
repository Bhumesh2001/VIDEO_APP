const cloudinary = require('cloudinary').v2;
const validUrl = require('valid-url');
const sharp = require('sharp');
const fs = require('fs').promises;

exports.uploadImageToCloudinary = async (filePathOrUrl, aspect_ratio) => {
    try {
        const result = await cloudinary.uploader.upload(filePathOrUrl, {
            resource_type: "image",
            transformation: [
                { width: aspect_ratio.width, height: aspect_ratio.height, crop: "fill" }
            ]
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

exports.deleteImageAndUploadToCloudinary = async (imageData_) => {
    const { resizedBuffer, format, aspect_ratio, folderName, public_id } = imageData_;
    try {
        await cloudinary.uploader.destroy(public_id);
        const imageData = this.uploadArticleImageToCloudinary(resizedBuffer, format, aspect_ratio, folderName);
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

exports.resizeImage = async (buffer, width, height) => {
    try {
        return await sharp(buffer)
            .resize(width, height)
            .toBuffer();
    } catch (error) {
        console.error('Error resizing image:', error);
        throw error;
    };
};

exports.imageToBuffer = async (imagePath) =>  {
    try {
        const data = await fs.readFile(imagePath);
        return data;
    } catch (err) {
        throw new Error(`Error reading file: ${err.message}`);
    };
};

exports.uploadArticleImageToCloudinary = async (buffer, format, aspect_ratio, folderName) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: folderName,
                resource_type: 'image',
                transformation: [
                    { width: aspect_ratio.width, height: aspect_ratio.height, crop: "fill" }
                ],
                format,
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve({ url: result.secure_url, public_id: result.public_id });
            }
        );
        // Pipe the buffer to the upload stream
        sharp(buffer).toFormat(format).pipe(stream);
    });
};
