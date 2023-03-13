const bcrypt = require('bcrypt');
const jws = require('jsonwebtoken');
const validator = require('validator');

const Post = require('../models/feed');
const User = require('../models/user');
const { JWT_SECRET } = require('../constants');
const { clearImage } = require('../utils/image');

module.exports = {
    posts: async function (args, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        const currentPage = args.page || 1;
        const pageLimit = 2;
        const skipValue = (currentPage - 1) * pageLimit;

        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find().skip(skipValue).limit(pageLimit).populate('creator');

        return { posts, totalItems };
    },

    post: async function ({ postId }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        const post = await Post.findById(postId).populate('creator');

        if (!post) {
            const error = new Error('Post not found');
            error.statusCode = 404;

            throw error;
        }

        return post;
    },

    user: async function (_, req) {
        if (!req.isAuth || !req.userId) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;

            throw error;
        }

        return user;
    },

    loginUser: async function (args, req) {
        const { email, password } = args.user;

        const errors = [];

        if (!validator.isEmail(email)) {
            errors.push({ message: 'Invalid email' });
        }

        if (errors.length) {
            const error = new Error('Invalid input data');
            error.code = 422;
            error.data = errors;

            throw error;
        }

        const user = await User.findOne({ email });

        if (!user) {
            const error = new Error('User with provided email does not exists');
            error.code = 401;

            throw error;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            const error = new Error('Wrong password');
            error.code = 401;

            throw error;
        }

        const token = jws.sign({ email, userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

        return { token, userId: user.id };
    },

    signupUser: async function (args, req) {
        const { email, name, password } = args.user;

        const errors = [];

        if (!validator.isEmail(email)) {
            errors.push({ message: 'Invalid email' });
        }

        if (!validator.isAlphanumeric(name) || !validator.isLength(name, { min: 5 })) {
            errors.push({ message: 'Invalid name' });
        }

        if (validator.isEmpty(password)) {
            errors.push({ message: 'Inalid password' });
        }

        if (errors.length) {
            const error = new Error('Invalid input data');
            error.code = 422;
            error.data = errors;

            throw error;
        }

        const user = await User.findOne({ email });

        if (user) {
            const error = new Error('User with provided email already exists');
            error.code = 422;
            throw error;
        }

        const hashedPwd = await bcrypt.hash(password.trim(), 12);
        const newUser = await new User({
            email: validator.normalizeEmail(email),
            name: name.trim(),
            password: hashedPwd,
        }).save();

        return { user: newUser._id };
    },

    createPost: async function ({ post }, req) {
        if (!req.isAuth || !req.userId) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        const errors = [];

        if (!validator.isLength(post.title, { min: 5 })) {
            errors.push({ message: 'Invalid title' });
        }

        if (!validator.isLength(post.content, { min: 5 })) {
            errors.push({ message: 'Invalid content' });
        }

        if (errors.length) {
            const error = new Error('Invalid input data');
            error.code = 422;
            error.data = errors;

            throw error;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            const error = new Error('User not found');
            error.code = 401;

            throw error;
        }

        const newPost = await new Post({
            title: post.title,
            content: post.content,
            imageUrl: post.imageUrl,
            creator: user,
        }).save();

        // io.getIO().emit('posts', { type: 'create', post: populatedPost, userId: req.userId });

        return newPost;
    },

    updatePost: async function ({ id, post }, req) {
        if (!req.isAuth || !req.userId) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        const storedPost = await Post.findById(id);

        if (!storedPost) {
            const error = new Error('Post not found');
            error.code = 401;

            throw error;
        }

        if (req.userId !== storedPost.creator._id.toString()) {
            const error = new Error('Not authorized');
            error.code = 403;

            throw error;
        }

        const errors = [];

        if (!validator.isLength(post.title, { min: 5 })) {
            errors.push({ message: 'Invalid title' });
        }

        if (!validator.isLength(post.content, { min: 5 })) {
            errors.push({ message: 'Invalid content' });
        }

        if (errors.length) {
            const error = new Error('Invalid input data');
            error.code = 422;
            error.data = errors;

            throw error;
        }

        // io.getIO().emit('posts', { type: 'create', post: populatedPost, userId: req.userId });

        storedPost.title = post.title;
        storedPost.content = post.content;
        let imageUrl = '';

        if (req.file) {
            clearImage(post.imageUrl);
            imageUrl = req.file.path.replace('\\', '/');
        } else {
            imageUrl = post.imageUrl;
        }

        storedPost.imageUrl = imageUrl;

        const updatedPost = await storedPost.save();
        const populatedPost = await updatedPost.populate('creator', 'name');

        return populatedPost;
    },

    // io.getIO().emit('posts', { type: 'update', post: populatedPost, userId: req.userId });

    deletePost: async function ({ postId }, req) {
        if (!req.isAuth || !req.userId) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        const post = await Post.findById(postId);

        if (!post) {
            const error = new Error('No post found');
            error.statusCode = 404;

            throw error;
        }

        if (req.userId !== post.creator.toString()) {
            const error = new Error('Not authorized');
            error.code = 403;

            throw error;
        }

        await post.remove();
        clearImage(post.imageUrl);

        return { message: 'Removed successfully', id: postId };
    },

    updateStatus: async function ({ status }, req) {
        if (!req.isAuth || !req.userId) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        if (validator.isEmpty(status)) {
            const error = new Error('Value status required');
            error.code = 422;

            throw error;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            const error = new Error('User not found');
            error.code = 404;

            throw error;
        }

        user.status = status;

        const updatedUser = await user.save();

        return updatedUser;
    },
};
