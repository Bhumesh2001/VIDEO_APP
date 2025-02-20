// helmet config
exports.helmetConfig = {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",  // Font Awesome CDN
        ],
        styleSrc: [
            "'self'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",  // Font Awesome Styles
            "https://fonts.googleapis.com",
            "'unsafe-inline'"
        ],
        fontSrc: [
            "'self'",
            "https://cdnjs.cloudflare.com",  // Font Awesome Fonts
            "https://cdn.jsdelivr.net",
            "https://fonts.gstatic.com",
            "data:"
        ],
        imgSrc: [
            "'self'",
            "https://cdnjs.cloudflare.com",
            "https://res.cloudinary.com",  // ✅ Cloudinary Allowed
            "https://via.placeholder.com",
            "https://cdn-icons-png.flaticon.com",
            "data:"
        ], // Allow icons
        mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
    },
};
