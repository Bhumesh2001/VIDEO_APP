require('dotenv').config();
require('./utils/subs.userUtil');
const express = require('express');
const cors = require('cors');
const cookiParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const cloudinary = require('cloudinary').v2;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const { connectToDB } = require('./db/connect');

const adminRouter = require('./routes/adminRoute');
const userRouter = require('./routes/userRoute');

const { adminAuth } = require('./middlewares/adminMiddleware/auth.adminMdlwr');;

app.use(cors({
    origin: [
        'https://web-digital-vle.netlify.app',
        'https://digital-vle-admin-login.netlify.app',
        'http://127.0.0.1:5500',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use(cookiParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
}));

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

connectToDB();

app.get('/', adminAuth, (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.use('/admin', adminRouter);
app.use('/user', userRouter);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}\n`);
    console.log(`Go to this url for google login => http://localhost:${PORT}/user/auth/google`);
    console.log(`Go to this url for facebook login => http://localhost:${PORT}/user/auth/facebook\n`);
});
