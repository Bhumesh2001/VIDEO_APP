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
