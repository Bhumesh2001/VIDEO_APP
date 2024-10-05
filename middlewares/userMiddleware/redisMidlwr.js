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

    try {
        const cachedResponse = await client.get(key);

        if (cachedResponse) {
            console.log('Serving from cache');
            res.send(JSON.parse(cachedResponse));
        } else {
            res.sendResponse = res.send;
            res.send = async (body) => {
                await client.setEx(key, 600, JSON.stringify(body));  // Cache the response for 10 min
                res.sendResponse(body);
            };
            next();
        }
    } catch (error) {
        console.error('Redis error: ', error);
        next();
    }
};