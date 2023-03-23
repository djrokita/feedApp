const { validationResult } = require('express-validator/check');

const User = require('../models/user');

exports.getUser = async (req, res, next) => {
    const { userId } = req;

    try {
        if (!userId) {
            const error = new Error('Not authenticated');
            error.statusCode = 422;

            throw error;
        }

        const user = await User.findById(userId);

        if (!user) {
            const error = new Error('No user found');
            error.statusCode = 404;

            throw error;
        }

        res.status(200).json(user);
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    const { status } = req.body;
    const { userId } = req;

    try {
        if (!userId) {
            const error = new Error('Not authenticated');
            error.statusCode = 422;

            throw error;
        }

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const error = new Error('Title or content are invalid');
            error.statusCode = 422;

            throw error;
        }

        const user = await User.findById(userId);

        if (!user) {
            const error = new Error('No user found');
            error.statusCode = 404;

            throw error;
        }

        user.status = status;
        const updatedUser = await user.save();
        res.status(200).json({ message: 'Updated successfully' });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};
