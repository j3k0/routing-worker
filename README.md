# routing-worker
A CloudFlare worker that route requests depending on the value of a query parameter

## Usage

Deploy as a [CloudFlare worker](https://workers.cloudflare.com/).

(explain how)

## How does it work?

This worker will route requests to a specified backend based on a configuration stored in [Cloudflare's KV store](https://developers.cloudflare.com/workers/learning/how-kv-works/).

It reads the value of a routing key from the request: it can be a query parameter or the from the `Authentication` header.

## Routing Key

The routing key is either a query parameter or a value extracted from the Authorization header.

### Query Parameter

Customize the name of the query parameter by changing the first line of code `const QUERY_PARAMETER = "my-query-parameter"`.

### Authorization Header

The authorization header needs to be specified with this format: `Basic ${base64(user + ':' + pass)}`.

The `user` part can be used as a routing key. Enable this by setting `const USE_BASIC_AUTHORIZATION_HEADER = true` in the first line of code.

## Environment configuration

### Adding environment variables via wrangler
Environment variables are defined via the [vars] configuration in your wrangler.toml file and are always plaintext values.
```
# Define top-level environment variables
# under the `[vars]` block using
# the `key = "value"` format
[vars]
QUERY_PARAMETER = "my-query-parameter"
USE_BASIC_AUTHORIZATION_HEADER = "true"
DEFAULT_KEY = "$default"

# Override values for `--env production` usage
[env.production]
name = "router-worker-prod"
[env.production.vars]
QUERY_PARAMETER = "my-query-parameter"
USE_BASIC_AUTHORIZATION_HEADER = "true"
DEFAULT_KEY = "$default"
```

The variables can be added also from the dashboard, and/or can be adjusted and changed.
1- Go to your Workers script > Settings > Add variable under Environment Variables.
2- Input a Variable name and its value, which will be made available to your Worker.
3- If your variable is a secret, select Encrypt to protect its value. This will prevent the value from being visible via wrangler and the dashboard.
4- (Optional) To add multiple environment variables, select Add variable.
5- Select Save to implement your changes.



## Selecting a backend

The routing worker will fetch the configuration from the KV store, using the Routing Key as a key. The value contains the URL (`<protocol>://<host>:<port`) where to send the request to. The request is then forwarded to the appropriate backend. _Note: see [this example](https://developers.cloudflare.com/workers/examples/ab-testing/), however in our case we also have to support `POST` requests (forwarding the request body)_

In case no value is found for this routing key, configuration should be retrieved from the `$default` key in the KV store.

## Caching

configuration will very rarely change. The worker can keep a local cache:

```ts
backendConfigurationCache: {
  [routingKey: string]: {
    url: string;
    expiresAt: Date;
  }
}
```

The function that loads from KV should firt check in the local cache if the value exists (and isn't expired). If so, return the cached value. If not, load from KV and update the cache.

# License

(c) 2022, Fovea
