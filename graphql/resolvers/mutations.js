const bcrypt = require('bcrypt');
const jws = require('jsonwebtoken');
const validator = require('validator');

const Post = require('../../models/feed');
const User = require('../../models/user');
const { clearImage } = require('../../utils/image');
const EVENTS = require('../subEvents');
const pubsub = require('../../utils/pubsub');

module.exports = {
    loginUser: async function (_, args) {
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

        const token = jws.sign({ email, userId: user.id }, process.env.JWT_SECRET, { expiresIn: '3h' });

        return { token, userId: user.id };
    },

    signupUser: async function (_, args) {
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

    createPost: async function (_, { post }, context) {
        if (!context.isAuth || !context.userId) {
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

        const user = await User.findById(context.userId);

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

        pubsub.publish(EVENTS.POST_CHANGE, { action: 'create', post: newPost, userId: context.userId });

        return newPost;
    },

    updatePost: async function (_, { id, post }, context) {
        if (!context.isAuth || !context.userId) {
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

        if (context.userId !== storedPost.creator._id.toString()) {
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

        storedPost.title = post.title;
        storedPost.content = post.content;

        if (post.imageUrl !== storedPost.imageUrl) {
            clearImage(storedPost.imageUrl);
            storedPost.imageUrl = post.imageUrl;
        }

        const updatedPost = await storedPost.save();
        const populatedPost = await updatedPost.populate('creator', 'name');

        pubsub.publish(EVENTS.POST_CHANGE, { action: 'update', post: populatedPost, userId: context.userId });

        return populatedPost;
    },

    deletePost: async function (_, { postId }, context) {
        if (!context.isAuth || !context.userId) {
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

        if (context.userId !== post.creator.toString()) {
            const error = new Error('Not authorized');
            error.code = 403;

            throw error;
        }

        await post.remove();
        clearImage(post.imageUrl);

        pubsub.publish(EVENTS.POST_DELETE, { id: post.id });

        return { message: 'Removed successfully', id: postId };
    },

    updateStatus: async function (_, { status }, context) {
        if (!context.isAuth || !context.userId) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        if (validator.isEmpty(status)) {
            const error = new Error('Value status required');
            error.code = 422;

            throw error;
        }

        const user = await User.findById(context.userId);

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
