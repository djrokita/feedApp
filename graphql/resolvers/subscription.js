const EVENTS = require('../subEvents');
const pubsub = require('../../utils/pubsub');

module.exports = {
    test: {
        subscribe: () => pubsub.asyncIterator(EVENTS.TEST_EVENT),
        resolve: (payload) => payload,
    },
    changePost: {
        subscribe: () => pubsub.asyncIterator(EVENTS.POST_CHANGE),
        resolve: (payload) => payload,
    },
    deletePost: {
        subscribe: () => pubsub.asyncIterator(EVENTS.POST_DELETE),
        resolve: (payload) => payload,
    },
};
