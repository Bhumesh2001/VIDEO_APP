const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const axios = require('axios');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);
const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

exports.uploadVideo = async (input, options = {}) => {
    try {
        let uploadOptions = {
            resource_type: "video",
            chunk_size: CHUNK_SIZE,
            ...options,
        };

        const isUrl = isValidUrl(input);

        if (isUrl) {
            return uploadFromUrl(input, uploadOptions);
        } else {
            return uploadFromFile(input, uploadOptions);
        }
    } catch (error) {
        console.error('Error uploading video:', error.message);
        throw new Error(`Failed to upload video: ${error.message}`);
    }
};

exports.uploadImage = async (input, options = {}) => {
    try {
        let uploadOptions = {
            resource_type: "image",
            ...options,
        };

        let isUrl;
        try {
            isUrl = isValidUrl(input);
        } catch (e) {
            isUrl = false;
        };

        if (isUrl) {
            return uploadFromUrl(input, uploadOptions);
        } else {
            return uploadFromFile(input, uploadOptions);
        };
    } catch (error) {
        console.error('Error uploading image:', error.message);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
};

async function uploadFromFile(filePath, uploadOptions) {
    const fileStream = fs.createReadStream(filePath);

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) return reject(error);
            resolve({
                public_id: result.public_id,
                url: result.secure_url,
            });
        });

        pipeline(fileStream, uploadStream).catch(reject);
    });
};

async function uploadFromUrl(url, uploadOptions) {
    const { data } = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 60000,
    });

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) return reject(error);
            resolve({
                public_id: result.public_id,
                url: result.secure_url,
            });
        });

        pipeline(data, uploadStream).catch(reject);
    });
};

exports.deleteImageOnCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        throw new Error(`Error deleting image: ${error.message}`);
    };
};
