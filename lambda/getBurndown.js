'use strict';

let _options;

function Workflow(options) {
    _options = options;
}

Workflow.prototype.run = (statePromise) => {
    return statePromise
        .then(parseIdentity)
        .then(setupBurndown)
        .then(loadAccounts)
        .then(loadPlan)
        .then(loadActual)
        .then(loadForecast)
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

let setupBurndown = state => {
    let asofdate = new Date();
    if(state.event.queryStringParameters && state.event.queryStringParameters.asofdate) {
        asofdate = new Date(state.event.queryStringParameters.asofdate);
    }

    let startDate = null;
    let endDate = null;
    state.burndownType = state.event.pathParameters.burndownType.toUpperCase();
    switch(state.burndownType) {
        case 'YEAR':
            startDate = new Date(asofdate.getFullYear(), 0, 1);
            endDate = new Date(asofdate.getFullYear(), 11, 31);
            break;
        case 'MONTH':
            startDate = new Date(asofdate.getFullYear(), asofdate.getMonth(), 1);
            endDate = new Date(asofdate.getFullYear(), asofdate.getMonth()+1, 0);
            break;
        case 'PAYCHECK':
            let paydates = [7,22]; // TODO: load paydates dynamically
            let firstPaydate = getPriorWorkday(new Date(asofdate.getFullYear(), asofdate.getMonth(), paydates[0]));
            let secondPaydate = getPriorWorkday(new Date(asofdate.getFullYear(), asofdate.getMonth(), paydates[1]));

            if(asofdate >= firstPaydate && asofdate < secondPaydate) {
                startDate = firstPaydate;
                endDate = new Date(secondPaydate.getTime());
                endDate.setDate(endDate.getDate() - 1);
            } else if( asofdate < firstPaydate) {
                startDate = new Date(secondPaydate.getTime());
                startDate.setMonth(startDate.getMonth() - 1);
                endDate = new Date(firstPaydate.getTime());
                endDate.setDate(endDate.getDate() - 1);
            } else {
                startDate = secondPaydate;
                endDate = new Date(firstPaydate.getTime());
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(endDate.getDate() - 1);
            }
            break;
        default:
            throw new Error(`Invalid burndownType: ${state.burndownType}`);
    }

    state.burndown = {
        startDate: startDate,
        endDate: endDate
    };

    return state;
};

let loadAccounts = state => {
    var params = {
        TableName: _options.accountsTable,
        KeyConditionExpression: "identityId = :i",
        ExpressionAttributeValues: {
            ":i": state.identityId
        }
    };

    return _options.dynamodb.queryAsync(params)
        .then(data => {
            state.accounts = data.Items.filter(account => account.burndown && account.burndown.toUpperCase() === state.burndownType);
            return state;
        });
}

let loadPlan = state => {
    state.burndown.targetBalance = 0; // TODO: load target balance based on burndown type
    state.burndown.planTx = []; // TODO: load plan transactions for range
    
    return state;
};

let loadActual = state => {
    let plaidRequests = state.accounts.map(account =>
        _options.plaidClient.getConnectUserAsync(
            account.access_token,
            {
                pending: true,
                account: account.id,
                gte: state.burndown.startDate,
                lte: state.burndown.endDate
            }
        )
    );

    return Promise.all(plaidRequests)
        .then(responses => {
            let transactions = responses.map(r => r.transactions);
            state.burndown.actualTx = [].concat.apply([], transactions);
            state.burndown.startBalance = 0; // TODO: load starting balance from bank
            return state;
        });
};

let loadForecast = state => {
    state.burndown.forecastTx = []; // TODO: load forecast Tx based on plan and actual spending
    state.burndown.endBalance = 0; // TODO: forecast end balance
    return state;
};

let createResponse = state => {
    state.burndown.startDate = state.burndown.startDate.toISOString().substring(0, 10);
    state.burndown.endDate = state.burndown.endDate.toISOString().substring(0, 10);
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(state.burndown)
    };
};


function getPriorWorkday(dt) {
    let newDate = dt.getDate();
    if(dt.getDay() == 0) {
        newDate -= 2;
    } else if(dt.getDay() == 6) {
        newDate -= 1;
    }
    return new Date(dt.getFullYear(), dt.getMonth(), newDate);
}

