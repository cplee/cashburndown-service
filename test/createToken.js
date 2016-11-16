'use strict';

const expect = require('chai').expect;
const chance = require('chance').Chance();
const sinon = require('sinon');

describe('createToken', function() {
    let CreateTokenWorkflow = require('../lambda/createToken');
    describe('#run', function() {
        it('should create token', function() {
            let token = {
                public_token: chance.string(),
            };
            let event = {
                body: JSON.stringify(token)
            };
            let context = {
                identity: {
                    cognitoIdentityId: chance.string()
                }
            };
            let accounts = [{_id: 'bar'}];
            let access_token = chance.string();
            let options = {
                accountsTable: 'myaccounttable',
                plaidClient: {
                    exchangeTokenAsync: sinon.stub().returns(Promise.resolve({access_token: access_token})),
                    getConnectUserAsync: sinon.stub().returns(Promise.resolve({accounts: accounts}))
                },
                dynamodb: {
                    batchWriteAsync: sinon.stub().returns(Promise.resolve({UnprocessedItems: {}}))
                }
            };
            let state = {event: event, context: context};
            return new CreateTokenWorkflow(options)
                .run(Promise.resolve(state))
                .then(response => {
                    expect(state.identityId).to.equal(context.identity.cognitoIdentityId);
                    expect(state.public_token).to.equal(token.public_token);

                    sinon.assert.calledOnce(options.plaidClient.exchangeTokenAsync);
                    expect(state.access_token).to.equal(access_token);

                    sinon.assert.calledOnce(options.plaidClient.getConnectUserAsync);
                    expect(state.accounts).to.equal(accounts);

                    sinon.assert.calledOnce(options.dynamodb.batchWriteAsync);
                    var batchWriteParams = options.dynamodb.batchWriteAsync.getCall(0).args[0];
                    var putItem = batchWriteParams.RequestItems[options.accountsTable][0].PutRequest.Item;
                    expect(putItem.identityId).to.equal(state.identityId);
                    expect(putItem.id).to.equal(accounts[0]._id);
                    expect(putItem.access_token).to.equal(state.access_token);
                    expect(putItem.public_token).to.equal(state.public_token);

                    expect(response.statusCode).to.equal(201)

                });
        });
    });
});