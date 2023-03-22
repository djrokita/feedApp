const jwt = require('jsonwebtoken');
const Post = require('../models/feed');

exports.isAuthenticated = (req, res, next) => {
    const tokenHeader = req.get('Authentication');

    try {
        if (!tokenHeader) {
            const error = new Error('Not authenticated');
            error.statusCode = 422;

            throw error;
        }

        const token = tokenHeader.replace('Bearer', '').trim();

        const data = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = data.userId;
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }

    next();
};

exports.isAuthorized = async (req, res, next) => {
    const { userId } = req;
    const { postId } = req.params;

    try {
        if (!userId) {
            const error = new Error('Not authenticated');
            error.statusCode = 422;

            throw error;
        }

        if (!postId) {
            const error = new Error('No referance to post');
            error.statusCode = 400;

            throw error;
        }

        const post = await Post.findById(postId);

        if (!post) {
            const error = new Error('No post found');
            error.statusCode = 404;

            throw error;
        }

        if (post.creator.toString() !== userId) {
            const error = new Error('Not authorized action');
            error.statusCode = 403;

            throw error;
        }
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }

    next();
};
