import { EdgeKVNamespace, makeEdgeEnv } from 'edge-mock'
import { backendConfigurationCache, getRoute, isExpired } from '../src/cache'

declare var global: any

const DEFAULT_URL = 'https://fancyhints.com'
const MATCHED1_URL = 'https://google.com'
const MATCHED2_URL = 'https://yahoo.com'

describe('cache-route', () => {
    beforeEach(async () => {
        makeEdgeEnv()
        //Object.assign(global, makeServiceWorkerEnv())
        const ROUTING_KEYS: EdgeKVNamespace = new EdgeKVNamespace()
        await ROUTING_KEYS._putMany({
            $default: DEFAULT_URL,
            alice: MATCHED1_URL,
            bob: MATCHED2_URL,
        })
        Object.assign(global, { ROUTING_KEYS })
        jest.resetModules()
    })

    test('fill routes into internal cache', async () => {
        expect(backendConfigurationCache).toEqual({})
        const route = await getRoute('test')
        expect(Object.keys(backendConfigurationCache).length).toEqual(3)
    })

    test('return default url if key not found', async () => {
        const route = await getRoute('test')
        expect(route).not.toBeUndefined()
        expect(route?.url).toEqual(DEFAULT_URL)
    })

    test('return routed url if key is matched', async () => {
        const route = await getRoute('alice')
        expect(route).not.toBeUndefined()
        expect(route?.url).toEqual(MATCHED1_URL)
    })

    test('refetch from namespace incase it is expired', async () => {
        const expiredDate = new Date()
        expiredDate.setHours(-1)
        backendConfigurationCache['alice'].expiresAt = expiredDate

        expect(isExpired(backendConfigurationCache['alice'])).toEqual(true)
        const route = await getRoute('alice')
        expect(route).not.toBeUndefined()
        expect(route?.url).toEqual(MATCHED1_URL)
        expect(route?.expiresAt.getTime()).toBeGreaterThan(new Date().getTime())

        expect(isExpired(backendConfigurationCache['alice'])).toEqual(false)
    })
})
