const EVENTS = require('../subEvents');
const pubsub = require('../../utils/pubsub');

module.exports = {
    test: {
        subscribe: () => pubsub.asyncIterator(EVENTS.TEST_EVENT),
        resolve: (payload) => {
            console.log('🚀 ~ file: subscription.js:10 ~ payload:', payload);
            return payload;
        },
    },
    post: {
        subscribe: () => pubsub.asyncIterator(EVENTS.POST),
        resolve: (payload) => {
            console.log('🚀 ~ file: subscription.js:10 ~ payload:', payload);
            return payload;
        },
    },
    deletePost: {
        subscribe: () => pubsub.asyncIterator(EVENTS.POST_DELETE),
        resolve: (payload) => {
            console.log('🚀 ~ file: subscription.js:10 ~ payload:', payload);
            return payload;
        },
    },
};
