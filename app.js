// Load Environment Variables
require('dotenv').config();

// Import Dependencies
const cluster = require('cluster');
const os = require('os');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const sanitizeHtml = require('sanitize-html');

require('./config/cloudinary');
require('./utils/storyUtil');
require('./utils/subs.userUtil');
const { connectToDB } = require('./config/connect');
const adminRouter = require('./routes/adminRoute');
const userRouter = require('./routes/userRoute');
const errorMiddleware = require('./middlewares/errorMiddleware');
const { helmetConfig } = require('./utils/csPolicy');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

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
        await connectToDB();
        app.set('trust proxy', 1);

        // Set view engine & static folder
        app.set("view engine", "ejs");
        app.use(express.static(path.join(__dirname, "public")));

        app.use(helmet.contentSecurityPolicy(helmetConfig));
        app.use(hpp());
        app.use(mongoSanitize());
        app.use(compression({ level: 6 }));
        app.use(sanitizeRequestBody);

        // 📌 Rate Limiting (Prevents Abuse)
        if (isProduction) {
            const apiLimiter = rateLimit({
                windowMs: 15 * 60 * 1000,
                max: 100,
                message: {
                    success: false,
                    status: 429,
                    message: 'Too many requests, Please try again later.'
                },
                standardHeaders: true,
                legacyHeaders: false,
            });
            app.use(apiLimiter);
        }

        // 📌 Body Parsing & Cookies
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(cookieParser());

        // 📌 Welcome Route
        app.get('/', (req, res) => res.render('welcome'));

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
        const gracefulShutdown = (signal) => {
            console.log(`🚦 ${signal} received. Shutting down gracefully...`);
            server.close(() => {
                console.log('🛑 Server closed.');
                process.exit(0);
            });
            setTimeout(() => {
                console.error('🛑 Forcing shutdown...');
                process.exit(1);
            }, 5000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error("❌ Server startup failed:", error);
        process.exit(1);
    }
};

// 📌 Clustering for Multi-Core CPU Usage
if (cluster.isPrimary) {  // ✅ Fixed `isMaster` to `isPrimary`
    console.log(`👑 Master process ${process.pid} is running`);
    const numCPUs = os.cpus().length;

    // Fork Workers for Each CPU Core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // 📌 Restart Worker If It Crashes
    cluster.on('exit', (worker, code, signal) => {
        console.error(`💀 Worker ${worker.process.pid} died with code ${code || 'NULL'}.`);
        console.log('♻️ Restarting worker...');
        setTimeout(() => cluster.fork(), 3000); // Restart worker after delay
    });
} else {
    startServer(); // ✅ Start Worker Server
};
