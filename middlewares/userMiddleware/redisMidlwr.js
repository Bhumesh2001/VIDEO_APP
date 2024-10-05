const redis = require('redis');

// Create a Redis client
const client = redis.createClient();

client.on('error', (err) => {
    console.error('Redis error: ', err);
});

client.connect(); // Connect to Redis server

// Middleware to cache responses
exports.cacheMiddleware = async (req, res, next) => {
    const key = req.originalUrl;  // Use the request URL as the key

    try {
        const cachedResponse = await client.get(key); // Check if the response is cached

        if (cachedResponse) {
            console.log('Serving from cache');
            res.send(JSON.parse(cachedResponse));  // Return the cached response
        } else {
            res.sendResponse = res.send;  // Save the original response method
            res.send = async (body) => {
                await client.setEx(key, 600, JSON.stringify(body));  // Cache the response for 10 min
                res.sendResponse(body);  // Send the response
            };
            next();  // Proceed to the route handler
        }
    } catch (error) {
        console.error('Redis error: ', error);
        next();  // In case of Redis error, proceed to route handler without caching
    }
};