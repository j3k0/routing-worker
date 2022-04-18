# Iaptic-Client

# Client library to access iaptic

## Retrieve customer purchases

**Method:** getCustomerPurchases(applicationUsername, callback)

**Parameters:**

  - `applicationUsername` (`string`, required) — application username ;
  - `callback` (`function(err, data)`) where `err` is an HttpError|ErrorResponseBody and `data` is a `CustomerPurchases` object.

Will retrieve the customer purchases from the billing api.

### client code: getCustomerPurchases


``` js
  const client = new PurchasesClient({
    appName: 'test',
    secretKey: 'api_secret'
  });
  
  client.getCustomerPurchases('my-application-username', (err, data) => {
    //access data here and check for errors.
    if(data.purchases['my-product-id'])
      console.log("The user has purchased a product");
  });
```


## Retrieve bulk information about your customers.

**Method:** getCustomersBulkInfo(parameters, callback)

**Parameters:**

  - `applicationUsername` (`string[]`, optional) — Comma separated list of URL-encoded application usernames.
Example: my%20user,alice,bob.
skip and limit are disregarded when this query parameter is specified.
  - `skip` (`number`, optional) - Number of rows to skip in the output.
  - `limit` (`number`, optional) - Maximal number of rows to return.
  - `callback` (`function(err, data)`) where `err` is an HttpError|ErrorResponseBody and `data` is a `CustomerSumamry` object.

its either limit & skip are defined, or the applicationUsername.

Will retrieve basic information about the customers from the billing api.

### client code: getCustomersBulkInfo


``` js
  const client = new PurchasesClient({
    appName: 'test',
    secretKey: 'api_secret'
  });
  
  client.getCustomersBulkInfo({limit: 10, skip: 0}, (err, data) => {
    //access data here and check for errors.
    if(data.rows.length > 0){
      //we have here rows returned from api
      data.rows.foreach((customerSumamry) => {
        //handle customer summary 
        if(customerSumamry.customerInfo.activeSubscriber)
          console.log(`The cusomter '${customerSumamry.applicationUsername}' is an active subscriber`);
      });
    }
  });
```

## Errors

Errors are returned as `ErrorResponseBody` or `HttpError` object containing the following fields:
- `ok` the errors' boolean value
- `status` the errors' status code like 400, 401, 403, ..
- `code` the errors' code message like InvalidPayload
- `message` the errors' actual message returned

```json
{
  "ok": false,
  "status": 400,
  "code": "InvalidPayload",
  "message": "Error: Invalid credentials"
}
//or
{
  "ok": false,
  "status": 400,
  "code": "InvalidPayload",
  "message": "Error: appName and apiKey do not match"
}
```

GPL-3.0-or-later License.
