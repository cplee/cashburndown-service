'use strict';

let _options;

function Workflow(options) {
    _options = options;
}

Workflow.prototype.run = (statePromise) => {
    return statePromise
        .then(parseIdentity)
        .then(getAccounts)
        .then(createResponse);
};

module.exports = Workflow;

let parseIdentity = state => {
    if(!state.context) {
        throw new Error('BadRequest: event is undefined');
    }

    state.identityId = state.context.identity.cognitoIdentityId;

    return state;
};

let getAccounts = state => {
    var params = {
        TableName : _options.accountsTable,
        KeyConditionExpression: "identityId = :i",
        ExpressionAttributeValues: {
            ":i": context.identity.cognitoIdentityId
        }
    };

    return _options.dynamodb.query(params)
        .then(data => {
            state.accounts = data.Items.map(account => {
                return {
                    id: account.id.S,
                    item: account.item.S,
                    user: account.user.S,
                    type: account.type.S,
                    subtype: account.subtype.S,
                    institution_type: account.institution_type.S
                };
            });
            return state;
        });
};

let createResponse = state => {
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin" : "*"
        },
        body: JSON.stringify(state.accounts)
    };
};

