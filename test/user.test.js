const { expect } = require('chai');
const sinon = require('sinon');

const User = require('../models/user');
const { getUser } = require('../controllers/user');

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

describe('User controller', function () {
    describe('GET user', function () {
        let userMock, next, res;

        beforeEach(function () {
            userMock = sinon.mock(User);
            next = sinon.spy();
            res = mockResponse();
        });

        afterEach(function () {
            userMock.restore();
        });

        it('should pass 422 error if no user is logged', async function () {
            const req = {};

            await getUser(req, {}, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(422);
            expect(error).has.property('message').that.is.equal('Not authenticated');
        });

        it('should pass user with response if it is found', async function () {
            const req = {
                userId: 'xyz',
            };

            const user = {
                email: 'test@test.com',
            };

            userMock.expects('findById').returns(user);

            await getUser(req, res, next);

            expect(next.called).to.be.false;
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith(user)).to.be.true;
        });

        it('should throw 404 error if no user found', async function () {
            const req = {
                userId: 'xyz',
            };

            userMock.expects('findById').returns(null);

            await getUser(req, res, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(404);
            expect(error).has.property('message').that.is.equal('No user found');
        });

        it('should throw 500 error if db throws', async function () {
            const req = {
                userId: 'xyz',
            };

            userMock.expects('findById').throws();

            await getUser(req, res, next);

            const error = next.args[0][0];

            expect(next.called).to.be.true;
            expect(error).to.exist;
            expect(error).to.be.an('error');
            expect(error).has.property('statusCode').that.is.equal(500);
        });
    });
});
