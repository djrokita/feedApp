const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

const { isAuthenticated, isAuthorized } = require('../middlewares/is-auth');
const Post = require('../models/feed');

const mockResponse = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
};

const mockRequest = (header) => {
    const req = {};
    req.get = sinon.stub().returns(undefined);
    // res.json = sinon.stub().returns(res);
    return req;
};

describe('Middlewares', function () {
    describe('Authentication', function () {
        it('should pass 422 error if no "Authentication" header is provided', function () {
            const req = {
                get: sinon.stub().returns(undefined),
            };

            const next = sinon.spy();
            isAuthenticated(req, {}, next);
            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.be.exist;
            expect(error).has.property('statusCode').that.is.equal(422);
        });

        it('should verify token', function () {
            const req = {
                get: sinon.stub().returns('token'),
            };

            sinon.stub(jwt, 'verify');
            isAuthenticated(req, {}, () => {});

            expect(jwt.verify.called).to.be.true;
            jwt.verify.restore();
        });

        it('should attach extracted "userId" to request', function () {
            const req = {
                get: sinon.stub().returns('token'),
            };

            sinon.stub(jwt, 'verify').returns({ userId: 'abc' });
            isAuthenticated(req, {}, () => {});
            jwt.verify.restore();

            expect(req).has.property('userId');
        });

        it('should throw 500 error if verification fails', function () {
            const req = {
                get: sinon.stub().returns('token'),
            };

            sinon.stub(jwt, 'verify').throws();

            const next = sinon.spy();
            isAuthenticated(req, {}, next);
            const error = next.args[0][0];

            expect(jwt.verify.called).to.be.true;
            jwt.verify.restore();

            expect(next.called).to.be.true;
            expect(error).to.be.exist;
            expect(error).has.property('statusCode').that.is.equal(500);
        });

        it('should invoke "next" if it is fine', function () {
            const req = {
                get: sinon.stub().returns('token'),
            };

            sinon.stub(jwt, 'verify').returns({ userId: 'abc' });
            const next = sinon.spy();

            isAuthenticated(req, {}, next);

            expect(next.called).to.be.true;
            expect(next.args[0]).to.be.empty;

            jwt.verify.restore();
        });
    });

    describe('Authorization', function () {
        it('should throw 422 "Not authenticated" error if no userId is provided', async function () {
            const req = {
                params: {},
            };

            const next = sinon.spy();
            await isAuthorized(req, {}, next);
            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.be.exist;
            expect(error).has.property('statusCode').that.is.equal(422);
            expect(error).has.property('message').that.is.equal('Not authenticated');
        });

        it('should throw 400 error if no postId is provided', async function () {
            const req = {
                userId: 'fakeUserId',
                params: {},
            };

            const next = sinon.spy();
            await isAuthorized(req, {}, next);
            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.be.exist;
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

            const postMockModel = sinon.mock(Post);
            postMockModel.expects('findById').returns(null);

            const next = sinon.spy();
            await isAuthorized(req, {}, next);
            postMockModel.restore();

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.be.exist;
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

            const postMockModel = sinon.mock(Post);
            postMockModel.expects('findById').returns(post);

            const next = sinon.spy();
            await isAuthorized(req, {}, next);
            postMockModel.restore();

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.be.exist;
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

            const postMockModel = sinon.mock(Post);
            postMockModel.expects('findById').returns(post);

            const next = sinon.spy();
            await isAuthorized(req, {}, next);
            postMockModel.restore();

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.be.not.exist;
        });
    });
});
