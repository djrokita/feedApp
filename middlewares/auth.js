const jws = require('jsonwebtoken');
const Post = require('../models/feed');
const { JWT_SECRET } = require('../constants');

exports.authentication = async (req, res, next) => {
    const tokenHeader = req.get('Authentication');

    if (!tokenHeader) {
        req.isAuth = false;

        return next();
    }

    const token = tokenHeader.replace('Bearer', '').trim();

    let decodedToken;

    try {
        decodedToken = jws.verify(token, JWT_SECRET);
    } catch (err) {
        req.isAuth = false;
        return next();
    }

    if (!decodedToken) {
        req.isAuth = false;
        return next();
    }

    req.userId = decodedToken.userId;
    req.isAuth = true;

    next();
};
