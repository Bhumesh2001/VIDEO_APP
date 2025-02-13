const NodeCache = require('node-cache');

// Create a cache instance
const cache = new NodeCache({ stdTTL: 1200, checkperiod: 600 });

// Cache middleware
exports.cacheMiddleware = (req, res, next) => {
    const key = req.originalUrl; // Use the URL as the cache key

    try {
        // Check if the response is already cached
        const cachedResponse = cache.get(key);
        if (cachedResponse) {
            return res.status(200).json(JSON.parse(cachedResponse));
        }

        // Override the `res.json` method to cache the response
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            cache.set(key, JSON.stringify(body)); // Cache the response
            originalJson(body);
        };

        next();
    } catch (error) {
        console.error('NodeCache error: ', error);
        next();
    };
};

// Universal function to clear cache
exports.clearCache = (type = "all") => {
    switch (type) {
        case "require":
            Object.keys(require.cache).forEach((key) => delete require.cache[key]);
            // console.log("✅ require cache cleared!");
            break;

        case "memory":
            global.gc?.(); // Runs garbage collection if available
            // console.log("✅ Memory cache cleared!");
            break;

        case "node-cache":
            cache.flushAll();
            // console.log("✅ node-cache cleared!");
            break;

        case "npm":
            const { exec } = require("child_process");
            exec("npm cache clean --force", (err, stdout, stderr) => {
                if (err) console.error("Error clearing npm cache:", stderr);
                // else console.log("✅ npm cache cleared:", stdout);
            });
            break;

        case "all":
            Object.keys(require.cache).forEach((key) => delete require.cache[key]);
            cache.flushAll();
            global.gc?.();
            // console.log("✅ All caches cleared!");
            break;

        default:
            console.log("⚠️ Invalid cache type. Use 'require', 'memory', 'node-cache', 'npm', or 'all'.");
    }
};
