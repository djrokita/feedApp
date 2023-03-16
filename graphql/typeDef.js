const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub } = require('graphql-subscriptions');

const Query = require('./resolvers/queries');
const Mutation = require('./resolvers/mutations');
const Subscription = require('./resolvers/subscription');
const typeDefs = require('./schema');

class RootResolver {
    constructor(query, mutation, subscription) {
        this.pubsub = new PubSub();
    }
}

module.exports = makeExecutableSchema({ typeDefs, resolvers: { Query, Mutation, Subscription } });
