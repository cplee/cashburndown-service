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
    if (!state.context) {
        throw new Error('BadRequest: event is undefined');
    }

    state.identityId = state.context.identity.cognitoIdentityId;

    return state;
};

let getAccounts = state => {
    console.log(JSON.stringify(state));
    var params = {
        TableName: _options.accountsTable,
        KeyConditionExpression: "identityId = :i",
        ExpressionAttributeValues: {
            ":i": state.identityId
        }
    };

    return _options.dynamodb.queryAsync(params)
        .then(data => {
            state.accounts = data.Items;
            state.accounts.forEach(a => {
                delete a.access_token;
                delete a.public_token;
            });
            return state;
        });
};

let createResponse = state => {
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(state.accounts)
    };
};

