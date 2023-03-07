const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const { v4 } = require('uuid');

const path = require('path');
const feedRouter = require('./routes/feed');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const cors = require('./utils/cors');
const ioService = require('./sockets');
const { MONGO_PATH } = require('./constants');

const app = express();

let ioSocket;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images');
    },
    filename: function (req, file, cb) {
        cb(null, v4() + '-' + file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        return cb(null, true);
    }

    return cb(null, false);
};

app.use(cors);
app.use(bodyParser.json());
app.use(multer({ storage, fileFilter }).single('image'));

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(userRouter);
app.use('/feed/', feedRouter);
app.use('/auth/', authRouter);

app.use((error, req, res, next) => {
    res.status(error.statusCode).json({ message: error.message, data: error.data });
});

mongoose
    .connect(MONGO_PATH)
    .then(() => {
        console.log('NEW USER CONNECTED');
        const server = app.listen(8080);
        ioService.init(server).on('connection', (socket) => {
            console.log('webSocket connected', socket.id);
        });
    })
    .catch((err) => console.log(err));
