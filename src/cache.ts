
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
    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 4);// add 4 hours for expiration
    return expireAt;
}
export const isExpired = (item: Route): boolean => {
    const now = new Date()
    return item.expiresAt < now
}

const getDefaultKey = (hostname: string | null) => {
    if (!hostname) return DEFAULT_KEY;
    return '$default.' + hostname;
}

const getForcedKey = (hostname: string | null) => {
    if (!hostname) return;
    return '$forced.' + hostname;
}

const getCache = (key: string) => ROUTING_KEYS.get(key);
const getDefaultRoute = async (hostname: string | null): Promise<Route | undefined> => {

    const defaultKey = getDefaultKey(hostname);
    if (!backendConfigurationCache[defaultKey] || isExpired(backendConfigurationCache[defaultKey])) {
        const value = await getCache(defaultKey);
        if (!value) {
            if (!hostname)
                return undefined;
            else
                return getDefaultRoute(null);
        }
        backendConfigurationCache[defaultKey] = {
            url: value,
            expiresAt: getExpirationDate()
        }
    }
    return backendConfigurationCache[defaultKey];
}

const getForcedRoute = async (hostname: string | null): Promise<Route | undefined> => {

    const forcedKey = getForcedKey(hostname);
    if (!forcedKey) return;
    if (!backendConfigurationCache[forcedKey] || isExpired(backendConfigurationCache[forcedKey])) {
        const value = await getCache(forcedKey);
        if (!value) {
            return;
        }
        backendConfigurationCache[forcedKey] = {
            url: value,
            expiresAt: getExpirationDate()
        }
    }
    return backendConfigurationCache[forcedKey];
}

// async function* listAll(namespace: KVNamespace, options?: KVNamespaceListOptions) {
//     let cursor;
//     let hasNextPage = true;
//     while (hasNextPage) {
//         const results = await namespace.list<string>({ ...options, cursor })
//         const { keys: queue } = results
//         hasNextPage = !results.list_complete

//         while (queue.length > 0) {
//             const key = queue.shift()
//             if (key !== undefined) yield key
//         }
//     }
// }

export const getRoute = async (hostname: string | null, key: string): Promise<Route | undefined> => {

    if (key === DEFAULT_KEY) {
        return await getDefaultRoute(hostname);
    }

    const forcedRoute = await getForcedRoute(hostname);
    if (forcedRoute) return forcedRoute;

    if (!key) {
        return await getDefaultRoute(hostname);
    }

    // if (Object.keys(backendConfigurationCache).length === 0) {
    //     //fill local cache from KVs.
    //     for await (const k of listAll(ROUTING_KEYS)) {
    //         // use values
    //         const value = await getCache(k.name);
    //         backendConfigurationCache[k.name] = {
    //             url: value as string,
    //             expiresAt: getExpirationDate()
    //         }
    //     }
    // }

    if (!backendConfigurationCache[key] || isExpired(backendConfigurationCache[key])) {
        const value = await getCache(key);
        if (!value) {
            return await getDefaultRoute(hostname);
        }
        backendConfigurationCache[key] = {
            url: value,
            expiresAt: getExpirationDate()
        }
        return backendConfigurationCache[key];
    }

    return backendConfigurationCache[key];
};
