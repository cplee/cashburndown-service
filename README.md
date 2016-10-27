# Idenity Pool
Setup Cognito identity pool named `Cashflow Burndown` with an Authenticated Role named `Cognito_CashflowBurndownAuth_Role`.  Enable *Google+* authentication provider and provide your *Google Client ID*.

# Deployment
Use Serverless to deploy:

```
sls deploy --plaid_client_id=<your_client_id> --plaid_client_secret=<your_client_secret>
```