const Post = require('../../models/feed');
const User = require('../../models/user');
const EVENTS = require('../subEvents');
const pubsub = require('../../utils/pubsub');

module.exports = {
    posts: async function (_, args, context) {
        if (!context.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        const currentPage = args.page || 1;
        const pageLimit = 2;
        const skipValue = (currentPage - 1) * pageLimit;

        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find().skip(skipValue).limit(pageLimit).populate('creator');

        // pubsub.publish(EVENTS.TEST_EVENT, { id: '123', name: 'Kasia' });

        return { posts, totalItems };
    },

    post: async function (_, { postId }, context) {
        if (!context.isAuth) {
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

    user: async function (_, _, context) {
        if (!context.isAuth || !context.userId) {
            const error = new Error('Not authenticated');
            error.code = 401;

            throw error;
        }

        const user = await User.findById(context.userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;

            throw error;
        }

        return user;
    },
};
