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
    }
};
