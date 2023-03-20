const { validationResult } = require('express-validator/check');
const bcrypt = require('bcrypt');
const jws = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = async (req, res, next) => {
    const { email, name, password } = req.body;
    const errors = validationResult(req);

    try {
        if (!errors.isEmpty()) {
            const error = new Error('Email or password are invalid');
            error.statusCode = 422;
            error.data = errors.array();

            throw error;
        }

        const user = await User.findOne({ email });

        if (user) {
            const error = new Error('User with provided email already exists');
            error.statusCode = 422;
            error.data = errors.array();

            throw error;
        }

        const hashedPwd = await bcrypt.hash(password, 12);
        const newUser = await new User({
            email,
            name,
            password: hashedPwd,
        }).save();

        res.status(201).json({ message: 'User created succesfully', user: newUser._id });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            const error = new Error('User with provided email does not exists');
            error.statusCode = 404;

            throw error;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (isValidPassword) {
            const userId = user._id.toString();

            const token = jws.sign({ email, userId }, process.env.JWT_SECRET, { expiresIn: '3h' });
            return res.status(200).json({ token, userId });
        }

        const error = new Error('Wrong password');
        error.statusCode = 422;

        throw error;
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        next(err);
    }
};
