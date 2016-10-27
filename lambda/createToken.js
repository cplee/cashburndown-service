'use strict';

let _options;

function Workflow(options) {
    _options = options;
}

Workflow.prototype.run = (statePromise) => {
        return statePromise
            .then(parseIdentity)
            .then(parseEvent)
            .then(exchangeToken)
            .then(getAccounts)
            .then(storeAccounts)
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

let parseEvent = state => {
    if(!state.event) {
        throw new Error('BadRequest: event is undefined');
    }
    const body_json = JSON.parse(event.body);
    state.public_token = body_json.public_token;
    state.institution_type = body_json.institution.type;

    return state;
};

let exchangeToken = state => {
    return _options.plaidClient.exchangeTokenAsync(state.public_token)
        .then(authResponse => {
            state.access_token = authResponse.access_token;
            return state;
        });
};

let getAccounts = state => {
    return _options.plaidClient.getAuthUserAsync(state.access_token)
        .then(resp => {
            state.accounts = resp.accounts;
            return state;
        });
};

let storeAccounts = state => {
    console.log("PUT: "+JSON.stringify(state.accounts));
    let putRequests = state.accounts.map(account => {
        return {
            PutRequest: {
                Item: {
                    identityId: { S: state.identityId },
                    id: { S: account._id },
                    item: { S: account._item},
                    user: { S: account._user},
                    type: { S: account.type },
                    subtype: { S: account.subtype },
                    institution_type: { S: account.institution_type },
                    access_token: { S: state.access_token },
                    public_token: { S: state.public_token }
                }
            }
        }
    });

    let params = { RequestItems: {} };
    params.RequestItems[_options.accountsTable] = putRequests;
    return _options.dynamodb.batchWriteItemAsync(params)
        .then((data) => {
            if (Object.keys(data.UnprocessedItems).length > 0) {
                console.error(`Unprocessed Items: ${data.UnprocessedItems}`);
                return Promise.reject('Some items were unprocessed');
            } else {
                return state;
            }
        });
};

let createResponse = state => {
    return {
        statusCode: 201,
        headers: {
            "Access-Control-Allow-Origin" : "*"
        }
    };
};

