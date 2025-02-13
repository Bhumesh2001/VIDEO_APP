// Load Environment Variables
require('dotenv').config();

// Import Dependencies
const cluster = require('cluster');
const os = require('os');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const sanitizeHtml = require('sanitize-html'); // ✅ Replaces `xss-clean`

// Import Configurations and Routes
require('./config/cloudinary');
require('./utils/storyUtil');
require('./utils/subs.userUtil');
const { connectToDB } = require('./config/connect');
const adminRouter = require('./routes/adminRoute');
const userRouter = require('./routes/userRoute');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// 📌 Function to Sanitize Request Body (Prevents XSS)
const sanitizeRequestBody = (req, res, next) => {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeHtml(req.body[key]);
            }
        }
    }
    next();
};

// 📌 Function to Start Express Server
const startServer = async () => {
    try {
        await connectToDB(); // ✅ Ensures DB connection before starting the server
        app.set('trust proxy', 1);

        // 📌 Middleware: Security & Performance
        app.use(cors({
            origin: [
                'https://video-app-0i3v.onrender.com',
            ],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        }));
        app.use(helmet());
        app.use(hpp());
        app.use(mongoSanitize());
        app.use(compression());
        app.use(sanitizeRequestBody); // ✅ Sanitize Input to Prevent XSS

        // 📌 Rate Limiting (Prevents Abuse)
        const apiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            message: 'Too many requests, please try again later.',
        });
        // app.use(apiLimiter);

        // 📌 Body Parsing & Cookies
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(cookieParser());

        // 📌 Welcome Route
        app.get('/', (req, res) => res.send('<h1>Welcome to Digital Vle App Backend</h1>'));

        // 📌 API Routes
        app.use('/admin', adminRouter);
        app.use('/user', userRouter);

        // 📌 404 Error Handling
        app.use((req, res, next) => {
            res.status(404).json({ success: false, status: 404, error: 'Resource not found' });
        });

        // 📌 Centralized Error Middleware
        app.use(errorMiddleware);

        // 📌 Start Server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Worker ${process.pid} running at http://localhost:${PORT}`);
        });

        // 📌 Graceful Shutdown Handling
        process.on('SIGTERM', () => {
            console.log('🚦 SIGTERM received. Shutting down gracefully...');
            server.close(() => {
                console.log('🛑 Server closed.');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🚦 SIGINT received. Shutting down gracefully...');
            server.close(() => {
                console.log('🛑 Server closed.');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error("❌ Server startup failed:", error.message);
        process.exit(1);
    }
};

// 📌 Clustering for Multi-Core CPU Usage
if (cluster.isMaster) {
    console.log(`👑 Master process ${process.pid} is running`);
    const numCPUs = os.cpus().length;

    // Fork Workers for Each CPU Core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    };

    // 📌 Restart Worker If It Crashes (Prevents Infinite Loops)
    cluster.on('exit', (worker, code, signal) => {
        console.error(`💀 Worker ${worker.process.pid} died with code ${code}.`);
        if (code !== 0) {
            console.log('♻️ Restarting worker...');
            setTimeout(() => cluster.fork(), 3000); // Restart the worker
        }
    });

} else {
    startServer(); // ✅ Start Worker Server
}

module.exports = app;
