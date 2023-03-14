const Post = require('../../models/feed');
const User = require('../../models/user');

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
};
