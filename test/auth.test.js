const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const { signup, login } = require('../controllers/auth');

const mockResponse = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
};

describe('Auth controller', function () {
    let userMock, bcryptStub, next, res;

    beforeEach(function () {
        userMock = sinon.mock(User);
        next = sinon.spy();
        res = mockResponse();
    });

    afterEach(function () {
        userMock.restore();
    });

    describe('signup user', function () {
        beforeEach(function () {
            bcryptStub = sinon.stub(bcrypt, 'hash');
        });

        afterEach(function () {
            bcryptStub.restore();
        });

        it('should throw 500 error if db throws', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    name: 'defaultName',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').throws();

            await signup(req, res, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(res.json.called).to.be.false;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(500);
        });

        it('should throw 422 error if user already exists', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    name: 'defaultName',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').returns(true);

            await signup(req, res, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(res.json.called).to.be.false;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(422);
            expect(error).has.property('message').that.is.equal('User with provided email already exists');
        });

        it('should throw 500 error if password hashing fails', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    name: 'defaultName',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').returns(false);

            const user = {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
            };

            sinon.stub(User.prototype, 'save').resolves(user);

            await signup(req, res, next);

            expect(next.called).to.be.false;
            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.called).to.be.true;

            sinon.assert.calledWith(res.json, sinon.match({ message: 'User created succesfully' }));
        });
    });

    describe('login user', function () {
        beforeEach(function () {
            bcryptStub = sinon.stub(bcrypt, 'compare');
        });

        afterEach(function () {
            bcryptStub.restore();
        });

        it('should pass 422 error if there is no user stored', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').returns(false);

            await login(req, res, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(res.json.called).to.be.false;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(404);
            expect(error).has.property('message').that.is.equal('User with provided email does not exists');
        });

        it('should throw 500 error if db throws', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').throws();

            await login(req, res, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(res.json.called).to.be.false;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(500);
        });

        it('should throw 500 error if password decprypting fails', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').returns(true);
            bcryptStub.throws();

            await login(req, res, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(res.json.called).to.be.false;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(500);
        });

        it('should throw 422 error if there is wrong password provided', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').returns({ _id: 'defealt_user_ID' });
            bcryptStub.returns(false);

            await login(req, res, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(res.json.called).to.be.false;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(422);
            expect(error).has.property('message').that.is.equal('Wrong password');
        });

        it('should throw 500 error if signing token fails', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').returns({ _id: 'defealt_user_ID' });
            bcryptStub.returns(true);
            sinon.stub(jwt, 'sign').throws();

            await login(req, res, next);

            jwt.sign.restore();

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(res.json.called).to.be.false;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(500);
        });

        it('should response with data if login succeeds', async function () {
            const req = {
                body: {
                    email: 'test@test.com',
                    password: 'defaultPassword',
                },
            };

            userMock.expects('findOne').returns({ _id: 'defealt_user_ID' });
            bcryptStub.returns(true);
            sinon.stub(jwt, 'sign').returns('xyz_default_token');

            await login(req, res, next);

            jwt.sign.restore();

            expect(next.called).to.be.false;
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({ token: 'xyz_default_token', userId: 'defealt_user_ID' })).to.be.true;
        });
    });
});
