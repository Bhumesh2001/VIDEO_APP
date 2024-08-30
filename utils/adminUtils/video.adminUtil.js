const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

exports.uploadStream = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) {
                resolve(result);
            } else {
                reject(error);
            }
        });
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};