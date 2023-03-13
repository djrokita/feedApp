const mongoose = require('mongoose');

const UserModel = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: 'new user',
    },
});

module.exports = mongoose.model('User', UserModel);
