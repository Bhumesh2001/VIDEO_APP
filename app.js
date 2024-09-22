require('dotenv').config();
require('./utils/subs.userUtil');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const cloudinary = require('cloudinary').v2;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const { connectToDB } = require('./db/connect');

const adminRouter = require('./routes/adminRoute');
const userRouter = require('./routes/userRoute');
const { adminAuthentication } = require('./middlewares/adminMiddleware/auth.adminMdlwr');

// CORS configuration
const allowedOrigins = [
    'https://web-digital-vle.netlify.app',
    'https://digital-vle-admin-login.netlify.app',
    'http://localhost:3001',
    'http://127.0.0.1:5500',
    'https://video-app-0i3v.onrender.com',
];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// View engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 1e12 }, // 1TB
    abortOnLimit: true,
    limitHandler: (req, res) => res.status(413).send('File is too large.'),
}));

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Database connection
connectToDB();

// Routes
app.get('/', adminAuthentication, (req, res) => res.render('index'));

app.get('/login', (req, res) => {
    if (req.cookies.adminToken) return res.redirect('/');
    res.render('login');
});

app.use('/admin', adminRouter);
app.use('/user', userRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Google login: http://localhost:${PORT}/user/auth/google`);
    console.log(`Facebook login: http://localhost:${PORT}/user/auth/facebook`);
});
