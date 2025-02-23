const MAX_FILE_SIZE_MB = 2 * 1024 * 1024; // 2MB Limit
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Utility function for password validation
exports.isValidPassword = (password) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return strongPasswordRegex.test(password);
};

// Utility function for image validation
exports.isValidImageUrl = (image) => {
    return /^(http|https):\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(image);
};

exports.isValidURL = (url) => {
    const regex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
    return regex.test(url);
};

// validate email
exports.isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// validate mobile number
exports.isValidMobileNumber = (mobile) => /^\d{10}$/.test(mobile);

exports.validateFile = (fileInfo, maxSize = MAX_FILE_SIZE_MB, allowedTypes = ALLOWED_IMAGE_TYPES) => {
    if (!fileInfo) {
        return { valid: false, message: "File is required!" };
    }

    if (!allowedTypes.includes(fileInfo.mimeType)) {
        return { valid: false, message: `Invalid file type! Only ${allowedTypes.join(", ")} are allowed.` };
    }

    if (fileInfo.size > maxSize) {
        return { valid: false, message: `File size must be ${maxSize / (1024 * 1024)}MB or less!` };
    }

    return { valid: true };
};