const express = require('express');

const authController = require('../controllers/auth');
const validators = require('../middlewares/validators');

const router = express.Router();

router.post(
    '/signup',
    [validators.isNameValid(), validators.isPasswordValid(), validators.isEmailValid()],
    authController.signup
);

router.post('/login', authController.login);

module.exports = router;
