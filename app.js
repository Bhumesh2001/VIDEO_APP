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
const xssClean = require('xss-clean');
const hpp = require('hpp');

// Import Configurations and Routes
require('./config/cloudinary');
require('./utils/storyUtil');
require('./utils/subs.userUtil');
const { connectToDB } = require('./config/connect');
const adminRouter = require('./routes/adminRoute');
const userRouter = require('./routes/userRoute');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// Function to Start Server
const startServer = () => {
    const PORT = process.env.PORT || 3001;

    // Trust Proxy (Required for Reverse Proxies like NGINX)
    app.set('trust proxy', 1);

    // Middleware: Security and Performance
    app.use(cors({
        origin: [
            'https://video-app-0i3v.onrender.com',
            'http://localhost:3000'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));
    app.use(helmet()); // Secure HTTP headers
    app.use(xssClean()); // Prevent Cross-Site Scripting (XSS)
    app.use(hpp()); // Prevent HTTP Parameter Pollution
    app.use(mongoSanitize()); // Prevent NoSQL Injection
    app.use(compression()); // Compress HTTP responses for faster delivery

    // Rate Limiting to Prevent Abuse
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per window
        message: 'Too many requests, please try again later.',
    });
    // app.use(apiLimiter);

    // Body Parsing and File Uploads
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // welcome message
    app.get('/', (req, res) => res.send('<h1>Welcome to Digital Vle App Backend</h1>'))

    // Routes
    app.use('/admin', adminRouter);
    app.use('/user', userRouter);

    // 404 Error Handling
    app.use((req, res, next) => {
        res.status(404).json({ success: false, status: 404, error: 'Resource not found' });
    });

    // Use the centralized error handler
    app.use(errorMiddleware);

    // Start the Server
    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} running at http://localhost:${PORT}`);
    });
};

// Clustering for Multi-Core CPU Usage
if (cluster.isMaster) {
    console.log(`Master process ${process.pid} is running`);
    const numCPUs = os.cpus().length;

    // Fork Workers for Each CPU Core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    };

    // Restart Workers if They Crash
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Connect to Database
    (async () => { await connectToDB(); })();

    // Start Worker Server
    startServer();
};

module.exports = app;