const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { v4 } = require('uuid');
const { graphqlHTTP } = require('express-graphql');

const path = require('path');
const cors = require('./utils/cors');
const schema = require('./graphql/typeDef');
const { MONGO_PATH } = require('./constants');
const auth = require('./middlewares/auth');

const app = express();

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
        graphiql: true,
        customFormatErrorFn(err) {
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

        const wss = new WebSocketServer({
            server,
        });

        useServer(
            {
                schema,
                onConnect: (ctx) => {
                    console.log('Connect');
                },
                onSubscribe: (ctx, msg) => {
                    console.log('Subscribe');
                },
                onNext: (ctx, msg, args, result) => {
                    console.debug('Next', result);
                },
                onError: (ctx, msg, errors) => {
                    console.error('Error');
                },
                onComplete: (ctx, msg) => {
                    console.log('Complete');
                },
            },
            wss
        );
    })
    .catch((err) => console.log(err));
