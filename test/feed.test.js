const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const io = require('../sockets');

const Post = require('../models/feed');
const { getPosts, getPost, createPost, deletePost, updatePost } = require('../controllers/feed');
const imageUtils = require('../utils/images');

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

describe('Feed controller', function () {
    let postMock, ioMock, next, res;

    beforeEach(function () {
        postMock = sinon.mock(Post);
        ioMock = sinon.stub(io, 'getIO').returns({ emit: sinon.spy() });
        next = sinon.spy();
        res = mockResponse();
    });

    afterEach(function () {
        postMock.restore();
        io.getIO.restore();
    });

    describe('get posts', function () {
        it('should throw 500 error if db throws', async function () {
            const req = {
                query: {
                    page: 1,
                },
            };

            postMock.expects('find').throws();

            await getPosts(req, {}, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(500);
        });

        it('should pass data with response if posts are found in db', async function () {
            const req = {
                query: {
                    page: 1,
                },
            };

            const pageLimit = 2;
            const skipValue = (req.query.page - 1) * pageLimit;

            const posts = [
                { _id: 'abc', title: 'defult title', content: 'default content' },
                { _id: 'xyz', title: 'another title', content: 'another content' },
                { _id: 'daa', title: 'random title', content: 'random content' },
            ];

            const populateSpy = sinon.stub().returns(posts.map((post) => ({ ...post, creator: { name: 'John' } })));
            const limitSpy = sinon.stub().returns({ populate: populateSpy });
            const skipStub = sinon.stub().returns({ limit: limitSpy });
            const countDocumentsStub = sinon.stub(Post, 'countDocuments').returns(posts.length);
            sinon.stub(Post, 'find').returns({ skip: skipStub, countDocuments: countDocumentsStub });

            await getPosts(req, res, next);

            expect(next.called).to.be.false;
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.called).to.be.true;

            sinon.assert.calledWith(res.json, sinon.match({ message: 'Posts fetched successfully' }));
            sinon.assert.calledWith(res.json, sinon.match({ totalItems: countDocumentsStub() }));
            sinon.assert.calledWith(res.json, sinon.match.has('posts'));

            sinon.assert.calledWithExactly(skipStub, skipValue);
            sinon.assert.calledWithExactly(limitSpy, pageLimit);
        });

        describe('get post', function () {
            it('should throw 500 error if db throws', async function () {
                const req = {
                    params: {
                        postId: 'xyz',
                    },
                };

                postMock.expects('findById').throws();

                await getPost(req, res, next);

                const error = next.args[0][0];

                expect(next.called).to.be.true;
                expect(error).to.exist;
                expect(error).to.be.an('error');
                expect(error).has.property('statusCode').that.is.equal(500);
            });

            it('should throw 404 error if there is no post found', async function () {
                const req = {
                    params: {
                        postId: 'xyz',
                    },
                };

                postMock.expects('findById').returns(null);

                await getPost(req, res, next);

                const error = next.args[0][0];

                expect(next.called).to.be.true;
                expect(error).to.exist;
                expect(error).to.be.an('error');
                expect(error).has.property('statusCode').that.is.equal(404);
                expect(error).has.property('message').that.is.equal('No post found');
            });

            it('should pass data with response if there is post found in db', async function () {
                const req = {
                    params: {
                        postId: 'xyz',
                    },
                };

                const post = {
                    _id: 'xyz',
                    title: 'defult title',
                    content: 'default content',
                };

                postMock.expects('findById').returns(post);

                await getPost(req, res, next);

                expect(next.called).to.be.false;
                expect(res.status.calledWith(200)).to.be.true;
                expect(res.json.called).to.be.true;

                sinon.assert.calledWith(res.json, sinon.match({ message: 'Post fetched successfully', post }));
            });
        });

        describe('create post', function () {
            it('should throw 422 error if there is no file attached', async function () {
                const req = {
                    body: {
                        title: 'title',
                        content: 'content',
                    },
                };

                await createPost(req, res, next);

                const error = next.args[0][0];

                expect(next.called).to.be.true;
                expect(error).to.exist;
                expect(error).to.be.an('error');
                expect(error).has.property('statusCode').that.is.equal(422);
                expect(error).has.property('message').that.is.equal('Invalid file attached');
            });

            it('should throw 500 error if db throws', async function () {
                const req = {
                    body: {
                        title: 'title',
                        content: 'content',
                    },
                    file: 'fake_image_url',
                };

                await createPost(req, res, next);

                const error = next.args[0][0];

                expect(next.called).to.be.true;
                expect(error).to.exist;
                expect(error).to.be.an('error');
                expect(error).has.property('statusCode').that.is.equal(500);
            });

            it('should pass data if there is new post created', async function () {
                const req = {
                    body: {
                        title: 'title',
                        content: 'content',
                    },
                    file: { path: 'fake_image_url' },
                    userId: mongoose.Types.ObjectId(),
                };

                const post = {
                    title: req.body.title,
                    content: req.body.content,
                    imageUrl: req.file.path,
                };

                const createdPost = { ...post, creator: { name: 'John' } };
                const populateSpy = sinon.stub().returns(createdPost);

                sinon.stub(Post.prototype, 'save').resolves({ ...post, populate: populateSpy });

                await createPost(req, res, next);

                expect(next.called).to.be.false;
                expect(res.status.calledWith(201)).to.be.true;
                expect(res.json.called).to.be.true;

                sinon.assert.calledWith(
                    res.json,
                    sinon.match({ message: 'Post created succesfully', post: createdPost })
                );
                sinon.assert.calledWith(io.getIO().emit, sinon.match('posts'), sinon.match({ type: 'create', post }));
            });
        });

        describe('delete post', function () {
            it('should throw 404 error if there is no post found', async function () {
                const req = {
                    params: {
                        postId: 'defalt_post_ID',
                    },
                };

                postMock.expects('findById').returns(null);

                await deletePost(req, res, next);

                const error = next.args[0][0];

                expect(next.called).to.be.true;
                expect(error).to.exist;
                expect(error).to.be.an('error');
                expect(error).has.property('statusCode').that.is.equal(404);
                expect(error).has.property('message').that.is.equal('No post found');
            });

            it('should throw 500 error if db throws', async function () {
                const req = {
                    params: {
                        postId: 'defalt_post_ID',
                    },
                };

                postMock.expects('findById').throws();

                await deletePost(req, res, next);

                const error = next.args[0][0];

                expect(next.called).to.be.true;
                expect(error).to.exist;
                expect(error).to.be.an('error');
                expect(error).has.property('statusCode').that.is.equal(500);
            });

            it('should pass data if there is post deleted', async function () {
                const req = {
                    params: {
                        postId: 'defalt_post_ID',
                    },
                    userId: 'fake_user_ID',
                };

                postMock.expects('findById').returns({ remove: sinon.stub(), imageUrl: 'fake_image_url' });

                sinon.stub(imageUtils, 'clearImage');

                await deletePost(req, res, next);

                expect(next.called).to.be.false;
                expect(res.status.calledWith(200)).to.be.true;
                expect(res.json.called).to.be.true;

                sinon.assert.calledWith(res.json, sinon.match({ message: 'Post removed successfully' }));
                sinon.assert.calledWith(
                    io.getIO().emit,
                    sinon.match('posts'),
                    sinon.match({ type: 'delete', postId: req.params.postId })
                );

                imageUtils.clearImage.restore();
            });
        });

        describe('update post', function () {
            it('should throw 404 error if there is no post found', async function () {
                const req = {
                    params: {
                        postId: 'defalt_post_ID',
                    },
                    body: {
                        title: 'new title',
                        content: 'changed content',
                    },
                };

                postMock.expects('findById').returns(null);

                await updatePost(req, res, next);

                const error = next.args[0][0];

                expect(next.called).to.be.true;
                expect(error).to.exist;
                expect(error).to.be.an('error');
                expect(error).has.property('statusCode').that.is.equal(404);
                expect(error).has.property('message').that.is.equal('No post found');
            });

            it('should throw 500 error if db throws', async function () {
                const req = {
                    params: {
                        postId: 'defalt_post_ID',
                    },
                    body: {
                        title: 'new title',
                        content: 'changed content',
                    },
                };

                postMock.expects('findById').throws();

                await updatePost(req, res, next);

                const error = next.args[0][0];

                expect(next.called).to.be.true;
                expect(error).to.exist;
                expect(error).to.be.an('error');
                expect(error).has.property('statusCode').that.is.equal(500);
            });

            it('should pass data if there is post updated', async function () {
                const req = {
                    params: {
                        postId: 'defalt_post_ID',
                    },
                    body: {
                        title: 'new title',
                        content: 'changed content',
                    },
                };

                const post = {
                    populate: sinon.spy(),
                };

                postMock.expects('findById').returns({ save: sinon.stub().returns(post) });

                await updatePost(req, res, next);

                expect(next.called).to.be.false;
                expect(res.status.calledWith(200)).to.be.true;
                expect(res.json.called).to.be.true;

                sinon.assert.calledWith(res.json, sinon.match({ message: 'Post updated successfully' }));
                sinon.assert.calledWith(io.getIO().emit, sinon.match('posts'), sinon.match({ type: 'update' }));
            });
        });
    });
});
