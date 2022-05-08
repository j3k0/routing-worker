
declare global {
    const ROUTING_KEYS: KVNamespace;
}

type Route = {
    url: string;
    expiresAt: Date;
}

export const backendConfigurationCache: {
    [routingKey: string]: Route
} = {}

const getExpirationDate = (): Date => {
    var expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 4);// add 4 hours for expiration
    return expireAt;
}
export const isExpired = (item: Route): boolean => {
    var now = new Date()
    return item.expiresAt < now
}

const getCache = (key: string) => ROUTING_KEYS.get(key);
const getDefaultRoute = async () => {

    if (!backendConfigurationCache[DEFAULT_KEY] || isExpired(backendConfigurationCache[DEFAULT_KEY])) {
        const value = await getCache(DEFAULT_KEY);
        if (!value) {
            return undefined;
        }
        backendConfigurationCache[DEFAULT_KEY] = {
            url: value,
            expiresAt: getExpirationDate()
        }
    }
    return backendConfigurationCache[DEFAULT_KEY];
}

async function* listAll(namespace: KVNamespace, options?: KVNamespaceListOptions) {
    let cursor;
    let hasNextPage = true;
    while (hasNextPage) {
        const results = await namespace.list<string>({ ...options, cursor })
        const { keys: queue } = results
        hasNextPage = !results.list_complete

        while (queue.length > 0) {
            const key = queue.shift()
            if (key !== undefined) yield key
        }
    }
}

export const getRoute = async (key: string) => {

    if (Object.keys(backendConfigurationCache).length === 0) {
        //fill local cache from KVs.
        for await (const k of listAll(ROUTING_KEYS)) {
            // use values
            const value = await getCache(k.name);
            backendConfigurationCache[k.name] = {
                url: value as string,
                expiresAt: getExpirationDate()
            }
        }
    }

    if (!backendConfigurationCache[key] || isExpired(backendConfigurationCache[key])) {
        const value = await getCache(key);
        if (!value) {
            return await getDefaultRoute();
        }
        backendConfigurationCache[key] = {
            url: value,
            expiresAt: getExpirationDate()
        }
        return backendConfigurationCache[key];
    }

    return backendConfigurationCache[key];
};
