const express = require('express');
const { body } = require('express-validator/check');

const feedController = require('../controllers/feed');
const { isAuthenticated, isAuthorized } = require('../middlewares/is-auth');
const validators = require('../middlewares/validators');

const router = express.Router();

router.get('/posts', isAuthenticated, feedController.getPosts);

router.post(
    '/post',
    isAuthenticated,
    [validators.isBodyPartValid('title'), validators.isBodyPartValid('content')],
    feedController.createPost
);

router.get('/post/:postId', isAuthenticated, isAuthorized, feedController.getPost);

router.put(
    '/post/:postId',
    isAuthenticated,
    isAuthorized,
    [validators.isBodyPartValid('title'), validators.isBodyPartValid('content')],
    feedController.updatePost
);

router.delete('/post/:postId', isAuthenticated, isAuthorized, feedController.deletePost);

module.exports = router;
