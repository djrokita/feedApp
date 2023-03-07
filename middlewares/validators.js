const { body } = require('express-validator/check');

exports.isBodyPartValid = (bodyPart) => {
    return body(bodyPart).trim().isLength({ min: 5 });
};

exports.isEmailValid = () => {
    return body('email').trim().isEmail();
};

exports.isNameValid = () => {
    return body('name').trim().isAlphanumeric().isLength({ min: 5 });
};

exports.isPasswordValid = () => {
    return body('password').trim().notEmpty();
};
