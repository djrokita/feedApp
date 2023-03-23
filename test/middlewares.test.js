const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

const { isAuthenticated, isAuthorized } = require('../middlewares/is-auth');
const Post = require('../models/feed');

describe('Middlewares', function () {
    let next;

    beforeEach(function () {
        next = sinon.spy();
    });

    describe('Authentication', function () {
        beforeEach(function () {
            sinon.stub(jwt, 'verify');
        });

        afterEach(function () {
            jwt.verify.restore();
        });

        it('should pass 422 error if no "Authentication" header is provided', function () {
            const req = {
                get: sinon.stub().returns(undefined),
            };

            isAuthenticated(req, {}, next);
            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(422);
        });

        it('should verify token', function () {
            const req = {
                get: sinon.stub().returns('token'),
            };

            isAuthenticated(req, {}, () => {});

            expect(jwt.verify.called).to.be.true;
        });

        it('should attach extracted "userId" to request', function () {
            const req = {
                get: sinon.stub().returns('token'),
            };

            jwt.verify.returns({ userId: 'abc' });
            isAuthenticated(req, {}, () => {});

            expect(req).has.property('userId');
        });

        it('should throw 500 error if verification fails', function () {
            const req = {
                get: sinon.stub().returns('token'),
            };

            jwt.verify.throws();

            isAuthenticated(req, {}, next);
            const error = next.args[0][0];

            expect(jwt.verify.called).to.be.true;
            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(500);
        });

        it('should invoke "next" if it is fine', function () {
            const req = {
                get: sinon.stub().returns('token'),
            };

            jwt.verify.returns({ userId: 'abc' });

            isAuthenticated(req, {}, next);

            expect(next.called).to.be.true;
            expect(next.args[0]).to.be.empty;
        });
    });

    describe('Authorization', function () {
        let postMock;

        beforeEach(function () {
            postMock = sinon.mock(Post);
        });

        afterEach(function () {
            postMock.restore();
        });

        it('should throw 422 "Not authenticated" error if no userId is provided', async function () {
            const req = {
                params: {},
            };

            await isAuthorized(req, {}, next);
            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(422);
            expect(error).has.property('message').that.is.equal('Not authenticated');
        });

        it('should throw 400 error if no postId is provided', async function () {
            const req = {
                userId: 'fakeUserId',
                params: {},
            };

            await isAuthorized(req, {}, next);
            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(400);
            expect(error).has.property('message').that.is.equal('No referance to post');
        });

        it('should throw 404 error if no post is found', async function () {
            const req = {
                userId: 'fakeUserId',
                params: {
                    postId: 'fakePostId',
                },
            };

            postMock.expects('findById').returns(null);

            await isAuthorized(req, {}, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(404);
            expect(error).has.property('message').that.is.equal('No post found');
        });

        it('should throw 403 error if given user is not matched', async function () {
            const req = {
                userId: 'fakeUserId',
                params: {
                    postId: 'fakePostId',
                },
            };

            const post = {
                creator: {
                    id: 'defaultUserId',
                },
            };

            postMock.expects('findById').returns(post);

            await isAuthorized(req, {}, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(403);
            expect(error).has.property('message').that.is.equal('Not authorized action');
        });

        it('should invoke "next" function if no error is thrown', async function () {
            const req = {
                userId: 'defaultUserId',
                params: {
                    postId: 'fakePostId',
                },
            };

            const post = {
                creator: 'defaultUserId',
            };

            postMock.expects('findById').returns(post);

            await isAuthorized(req, {}, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).not.to.exist;
        });
    });
});
