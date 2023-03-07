const { validationResult } = require('express-validator/check');
const io = require('../sockets');
// const { socket } = require('../app');

const path = require('path');
const fs = require('fs');

const Post = require('../models/feed');
const { getIO } = require('../sockets');

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page;
    const pageLimit = 2;
    const skipValue = (currentPage - 1) * pageLimit;

    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find().skip(skipValue).limit(pageLimit).populate('creator', 'name');

        res.status(200).json({ posts, message: 'Posts fetched successfully', totalItems });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};

exports.createPost = async (req, res, next) => {
    const { title, content } = req.body;
    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error('Title or content are invalid');
            error.statusCode = 422;

            throw error;
        }

        if (!req.file) {
            const error = new Error('Invalid file attached');
            error.statusCode = 422;

            throw error;
        }

        const imageUrl = req.file.path.replace('\\', '/');

        const post = await new Post({
            title,
            content,
            imageUrl,
            creator: req.userId,
        }).save();

        const populatedPost = await post.populate('creator', 'name');

        io.getIO().emit('posts', { type: 'create', post: populatedPost, userId: req.userId });

        res.status(201).json({ message: 'Post created succesfully', post: populatedPost });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const { postId } = req.params;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('No post found');
            error.statusCode = 404;

            throw error;
        }

        res.status(200).json({ post, message: 'Post fetched successfully' });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    const { postId } = req.params;
    const { title, content } = req.body;
    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error('Title or content are invalid');
            error.statusCode = 422;

            throw error;
        }

        let imageUrl;

        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('No post found');
            error.statusCode = 404;

            throw error;
        }

        if (req.file) {
            clearImage(post.imageUrl);
            imageUrl = req.file.path.replace('\\', '/');
        } else {
            imageUrl = post.imageUrl;
        }

        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;

        const updatedPost = await post.save();
        const populatedPost = await updatedPost.populate('creator', 'name');

        io.getIO().emit('posts', { type: 'update', post: populatedPost, userId: req.userId });

        res.status(200).json({ message: 'Post updated successfully', post: populatedPost });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    const { postId } = req.params;
    let imageUrl;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('No post found');
            error.statusCode = 404;

            throw error;
        }

        imageUrl = post.imageUrl;

        await post.remove();
        clearImage(imageUrl);

        io.getIO().emit('posts', { type: 'delete', postId, userId: req.userId });

        res.status(200).json({ message: 'Post removed successfully', postId });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};

const clearImage = (imageUrl) => {
    const imagePath = path.join(__dirname, '..', imageUrl);
    fs.unlink(imagePath, (err) => console.log(err));
};
