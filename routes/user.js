const express = require('express');

const userController = require('../controllers/user');
const validators = require('../middlewares/validators');
const { isAuthenticated, isAuthorized } = require('../middlewares/is-auth');

const router = express.Router();

router.get('/user', isAuthenticated, userController.getUser);

router.put('/user', isAuthenticated, validators.isBodyPartValid('status'), userController.updateUserStatus);

module.exports = router;
