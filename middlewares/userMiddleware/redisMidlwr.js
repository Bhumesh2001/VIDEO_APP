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
            return res.json(JSON.parse(cachedResponse));
        }

        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            await client.setEx(key, 1200, JSON.stringify(body)); // Cache for 20 minutes
            originalJson(body);
        };

        next();

    } catch (error) {
        console.error('Redis error: ', error);
        next();
    }
};
