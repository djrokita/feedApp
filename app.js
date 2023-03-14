const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const ws = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { v4 } = require('uuid');
const { graphqlHTTP } = require('express-graphql');

const path = require('path');
const cors = require('./utils/cors');
const ioService = require('./sockets');
const schema = require('./graphql/schema');
const rootValue = require('./graphql/resolvers');
const { MONGO_PATH } = require('./constants');
const { authentication: auth } = require('./middlewares/auth');

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

app.put('/post-image', (req, res, next) => {
    if (!req.file) {
        return res.status(200).json({ message: 'No file attached' });
    }

    const filePath = req.file.path.replace('\\', '/');

    return res.status(201).json({ filePath });
});

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(auth);
app.use(
    '/graphql',
    graphqlHTTP({
        schema,
        rootValue,
        graphiql: true,
        formatError(err) {
            if (!err.originalError) {
                return err;
            }

            const details = err.originalError.data;
            const message = err.message;
            const status = err.originalError.code || 500;

            return { message, status, details };
        },
    })
);

app.use((error, req, res, next) => {
    res.status(error.statusCode).json({ message: error.message, data: error.data });
});

mongoose
    .connect(MONGO_PATH)
    .then(() => {
        console.log('NEW USER CONNECTED');
        const server = app.listen(8080);

        const wss = new ws.Server({
            server,
        });

        useServer({ schema, roots: rootValue }, server);

        // ioService.init(server).on('connection', (socket) => {
        //     console.log('webSocket connected', socket.id);
        // });
    })
    .catch((err) => console.log(err));
