'use strict';

let Promise = require('bluebird');
let path = require('path');

// Setup config
require('dotenv').config();

// Setup AWS clients
let AWS = require('aws-sdk');
if(!AWS.config.region) {
    AWS.config.region = process.env.AWS_DEFAULT_REGION;
}
let dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
let dynamodbPromised = Promise.promisifyAll(dynamodb);

// Setup Plaid client
let plaid = require('plaid');
Promise.promisifyAll(plaid);
let plaidClient = new plaid.Client(process.env.PLAID_CLIENT_ID, process.env.PLAID_CLIENT_SECRET, plaid.environments[process.env.PLAID_ENV]);

// Define options
let options = {
    plaidClient:   plaidClient,
    dynamodb:      dynamodbPromised,
    stage:         process.env.SERVERLESS_STAGE,
    accountsTable: process.env.ACCOUNTS_TABLE
};

// Load lambdas
let lambdaPath = path.join(__dirname, "lambda");
require("fs").readdirSync(lambdaPath).forEach(function(file) {
    let moduleName = path.parse(file).name;
    let mod = require(`lambda/${moduleName}`);
    let workflow = new mod(options);
    module.exports[moduleName] = (event, context) => {
        let statePromise = Promise.resolve({event: event, context: context});
        workflow.run(statePromise)
            .then(context.succeed)
            .catch((err) => {
                if(err.stack) {
                    console.error(err.stack);
                } else {
                    console.error(err);
                }

                context.succeed({
                    statusCode: 500,
                    headers: {
                        "Access-Control-Allow-Origin" : "*"
                    }
                });
            });
    };
});
