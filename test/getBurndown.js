'use strict';

const expect = require('chai').expect;
const chance = require('chance').Chance();
const sinon = require('sinon');


describe('getBurndown', function() {
    let GetBurndownWorkflow = require('../lambda/getBurndown');
    let ddbAccounts = [
        {burndown: 'year'},
        {burndown: 'Year'},
        {burndown: 'month'},
        {burndown: 'paycheck'}
    ];
    let plaidAccountsAndTrans = [
        {
            accounts: [],
            transactions: []
        }
    ];
    let options = {
        dynamodb: {
            queryAsync: sinon.stub().returns(Promise.resolve({Items: ddbAccounts}))
        },
        plaidClient: {
            getConnectUserAsync: sinon.stub().returns(Promise.resolve(plaidAccountsAndTrans))
        }
    };
    let getBurndown = new GetBurndownWorkflow(options);

    let context = {
        identity: {
            cognitoIdentityId: chance.string()
        }
    };

    describe('#run', function() {
        it('should load fail for invalid burndown type', function() {
            let event = {
                pathParameters: {
                    burndownType: 'Quarter'
                }
            };
            let state = {event: event, context: context};
            return getBurndown
                .run(Promise.resolve(state))
                .then(response => {
                    expect.fail('should have thrown error')
                }).catch(err => {
                    expect(err.message).to.equal('Invalid burndownType: QUARTER');
                });
        });
        it('should load month burndown for today', function() {
            let event = {
                pathParameters: {
                    burndownType: 'Month'
                },
                queryStringParameters: {
                    asofdate: null
                }
            };
            let today = new Date();
            let expectedStart = new Date(today.getFullYear(), today.getMonth(), 1);
            let expectedEnd = new Date(today.getFullYear(), today.getMonth()+1, 0);

            let state = {event: event, context: context};
            return getBurndown
                .run(Promise.resolve(state))
                .then(response => {
                    expect(state.identityId).to.equal(context.identity.cognitoIdentityId);

                    expect(response.statusCode).to.equal(200);

                    let body = JSON.parse(response.body);
                    expect(new Date(body.startDate).toISOString()).to.equal(expectedStart.toISOString());
                    expect(new Date(body.endDate).toISOString()).to.equal(expectedEnd.toISOString());

                    expect (state.accounts).to.have.lengthOf(1);
                });
        });
        it('should load month burndown for date', function() {
            let asofdate = new Date(2016,11,20);
            let event = {
                pathParameters: {
                    burndownType: 'Month'
                },
                queryStringParameters: {
                    asofdate: asofdate
                }
            };
            let expectedStart = new Date(asofdate.getFullYear(), 11, 1);
            let expectedEnd = new Date(asofdate.getFullYear(), 11, 31);

            let state = {event: event, context: context};
            return getBurndown
                .run(Promise.resolve(state))
                .then(response => {
                    expect(state.identityId).to.equal(context.identity.cognitoIdentityId);

                    expect(response.statusCode).to.equal(200);

                    let body = JSON.parse(response.body);
                    expect(new Date(body.startDate).toISOString()).to.equal(expectedStart.toISOString());
                    expect(new Date(body.endDate).toISOString()).to.equal(expectedEnd.toISOString());

                    expect (state.accounts).to.have.lengthOf(1);
                });
        });
        it('should load year burndown for date', function() {
            let asofdate = new Date(2016,11,20);
            let event = {
                pathParameters: {
                    burndownType: 'Year'
                },
                queryStringParameters: {
                    asofdate: asofdate
                }
            };
            let expectedStart = new Date(asofdate.getFullYear(), 0, 1);
            let expectedEnd = new Date(asofdate.getFullYear(), 11, 31);

            let state = {event: event, context: context};
            return getBurndown
                .run(Promise.resolve(state))
                .then(response => {
                    expect(state.identityId).to.equal(context.identity.cognitoIdentityId);

                    expect(response.statusCode).to.equal(200);

                    let body = JSON.parse(response.body);
                    expect(new Date(body.startDate).toISOString()).to.equal(expectedStart.toISOString());
                    expect(new Date(body.endDate).toISOString()).to.equal(expectedEnd.toISOString());

                    expect (state.accounts).to.have.lengthOf(2);
                });
        });
        it('should load paycheck burndown for date #1', function() {
            let asofdate = new Date(2016,11,10);
            let event = {
                pathParameters: {
                    burndownType: 'Paycheck'
                },
                queryStringParameters: {
                    asofdate: asofdate
                }
            };
            let expectedStart = new Date(asofdate.getFullYear(), 11, 7);
            let expectedEnd = new Date(asofdate.getFullYear(), 11, 21);

            let state = {event: event, context: context};
            return getBurndown
                .run(Promise.resolve(state))
                .then(response => {
                    expect(state.identityId).to.equal(context.identity.cognitoIdentityId);

                    expect(response.statusCode).to.equal(200);

                    let body = JSON.parse(response.body);
                    expect(new Date(body.startDate).toISOString()).to.equal(expectedStart.toISOString());
                    expect(new Date(body.endDate).toISOString()).to.equal(expectedEnd.toISOString());

                    expect (state.accounts).to.have.lengthOf(1);
                });
        });
        it('should load paycheck burndown for date #2', function() {
            let asofdate = new Date(2016,11,27);
            let event = {
                pathParameters: {
                    burndownType: 'Paycheck'
                },
                queryStringParameters: {
                    asofdate: asofdate
                }
            };
            let expectedStart = new Date(asofdate.getFullYear(), 11, 22);
            let expectedEnd = new Date(asofdate.getFullYear()+1, 0, 6);

            let state = {event: event, context: context};
            return getBurndown
                .run(Promise.resolve(state))
                .then(response => {
                    expect(state.identityId).to.equal(context.identity.cognitoIdentityId);

                    expect(response.statusCode).to.equal(200);

                    let body = JSON.parse(response.body);
                    expect(new Date(body.startDate).toISOString()).to.equal(expectedStart.toISOString());
                    expect(new Date(body.endDate).toISOString()).to.equal(expectedEnd.toISOString());

                    expect (state.accounts).to.have.lengthOf(1);
                });
        });
    });
});