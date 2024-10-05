const redis = require('redis');

const client = redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    }
});

client.on('error', (err) => {
    console.error('Redis error: ', err);
});

client.connect();

exports.cacheMiddleware = async (req, res, next) => {
    const key = req.originalUrl;

    // Skip caching for login routes
    if (key === '/admin/login' || key === '/user/login') {
        return next();
    }

    try {
        const cachedResponse = await client.get(key);

        if (cachedResponse) {
            console.log('Serving from cache');
            return res.json(JSON.parse(cachedResponse)); // Send parsed JSON response
        }

        // Override res.json to cache response
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            await client.setEx(key, 1200, JSON.stringify(body)); // Cache for 20 minutes
            originalJson(body); // Send original response
        };

        next(); // Proceed to the next middleware
    } catch (error) {
        console.error('Redis error: ', error);
        next(); // Continue to next middleware even if Redis fails
    }
};
