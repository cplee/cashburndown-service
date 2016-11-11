'use strict';

let _options;

function Workflow(options) {
    _options = options;
}

Workflow.prototype.run = (statePromise) => {
    return statePromise
        .then(parseIdentity)
        .then(deleteAccount)
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

let deleteAccount = state => {
    console.log(JSON.stringify(state));
    var params = {
        TableName: _options.accountsTable,
        Key: {
            "identityId": state.identityId,
            "id": state.event.pathParameters.id
        }
    };
    console.log(JSON.stringify(params));

    return _options.dynamodb.deleteAsync(params);
};

let createResponse = state => {
    return {
        statusCode: 204,
        headers: {
            "Access-Control-Allow-Origin": "*"
        }
    };
};

