const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    input LoginData {
        email: String!
        password: String!
    }

    input SignupData {
        email: String!
        name: String!
        password: String!
    }

    input PostData {
        title: String!
        content: String!
        imageUrl: String!
    }

    type User {
        _id: ID!
        email: String!
        name: String!
        status: String!,
    }

    type NewUser {
        user: ID!
    }

    type Post {
        _id: ID!
        title: String!
        imageUrl: String!
        content: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type Posts {
        posts: [Post]!
        totalItems: Int!
    }

    type AuthUser {
        token: String!
        userId: String!
    }

    type MsgRes {
        message: String!
        id: ID!
    } 
    
    type Query {
        posts(page: Int): Posts!
        post(postId: ID!): Post!
        user: User!
    }

    type Mutation {
        loginUser(user: LoginData!): AuthUser
        signupUser(user: SignupData!): NewUser
        createPost(post: PostData!): Post!
        updatePost(id: ID!, post: PostData!): Post!
        deletePost(postId: ID!): MsgRes!
        updateStatus(status: String!): User! 
    }
`);
