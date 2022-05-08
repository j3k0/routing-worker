import { handleRequest } from '../src/handler'
import { EdgeKVNamespace, makeEdgeEnv } from 'edge-mock'
// import makeServiceWorkerEnv from 'service-worker-mock'
import live_fetch from 'edge-mock/live_fetch'

declare var global: any
const DEFAULT_URL = 'https://billing.fovea.cc'
const MATCHED1_URL = 'https://www.google.com'
const MATCHED2_URL = 'https://reqres.in'

const constants = {
  DEFAULT_KEY: "$default",
  QUERY_PARAMETER: 'my-query-parameter',
  USE_BASIC_AUTHORIZATION_HEADER: 'true'
}

const BODY_POST = {
  name: 'morpheus',
  job: 'leader',
}

const BASIC_AUTHEN_ALICE = 'Basic YWxpY2U6YWJjMTIz'
const BASIC_AUTHEN_BOB = 'Basic Ym9iOmFiYzEyMw=='

describe('handle', () => {
  beforeEach(async () => {
    makeEdgeEnv()
    //Object.assign(global, makeServiceWorkerEnv())
    const ROUTING_KEYS: EdgeKVNamespace = new EdgeKVNamespace()
    await ROUTING_KEYS._putMany({
      $default: DEFAULT_URL,
      alice: MATCHED1_URL,
      bob: MATCHED2_URL,
    })
    Object.assign(global, { ROUTING_KEYS, fetch: live_fetch })
    Object.assign(global, constants);

    if (typeof btoa === 'undefined') {
      global.btoa = function (str: string) {
        return Buffer.from(str, 'binary').toString('base64')
      }
    }

    if (typeof atob === 'undefined') {
      global.atob = function (b64Encoded: string) {
        return Buffer.from(b64Encoded, 'base64').toString('binary')
      }
    }

    jest.resetModules()
  })

  test('handle GET for default route', async () => {
    const result = await handleRequest(new Request('?foo=1', { method: 'GET' }))
    expect(result.url).toEqual('https://billing.fovea.cc/?foo=1')
    expect(result.status).toEqual(200)
  })

  test('handle GET for new route url by query-string', async () => {
    const result = await handleRequest(
      new Request(`/api/users?${QUERY_PARAMETER}=alice&some-other-query=234`, {
        method: 'GET',
      }),
    )
    expect(result.url).toEqual(
      `${MATCHED1_URL}/api/users?${QUERY_PARAMETER}=alice&some-other-query=234`,
    )
    expect(result.status).toEqual(404)
  })

  test('handle GET for new route url by query-string without pathname', async () => {
    const result = await handleRequest(
      new Request(`?${QUERY_PARAMETER}=alice&some-other-query=234`, {
        method: 'GET',
      }),
    )
    expect(result.url).toEqual(
      `${MATCHED1_URL}/?${QUERY_PARAMETER}=alice&some-other-query=234`,
    )
    expect(result.status).toEqual(200)
  })

  test('handle POST for new route url by query-string', async () => {
    const result = await handleRequest(
      new Request(`/api/users?${QUERY_PARAMETER}=bob&some-other-query=234`, {
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(BODY_POST),
      }),
    )
    expect(result.url).toEqual(
      `${MATCHED2_URL}/api/users?${QUERY_PARAMETER}=bob&some-other-query=234`,
    )
    expect(result.status).toEqual(201)
    const response = (await result.json()) as Record<string, string>
    expect(response['name']).toEqual('morpheus')
    expect(response['job']).toEqual('leader')
  })

  test('handle GET for default route', async () => {
    const result = await handleRequest(
      new Request('?foo=1', {
        method: 'GET',
        headers: {
          Authorization: 'Basic Ym9iMjM6YWJjMTIz',
        },
      }),
    )
    expect(result.url).toEqual('https://billing.fovea.cc/?foo=1')
    expect(result.status).toEqual(200)
  })

  test('handle GET for new route url by basic-authentication', async () => {
    const result = await handleRequest(
      new Request(`/api/users?some-other-query=234`, {
        method: 'GET',
        headers: {
          Authorization: BASIC_AUTHEN_ALICE,
        },
      }),
    )
    expect(result.url).toEqual(`${MATCHED1_URL}/api/users?some-other-query=234`)
    expect(result.status).toEqual(404)
  })

  test('handle GET for new route url by basic-authentication without pathname', async () => {
    const result = await handleRequest(
      new Request(`?some-other-query=234`, {
        method: 'GET',
        headers: {
          Authorization: BASIC_AUTHEN_ALICE,
        },
      }),
    )
    expect(result.url).toEqual(`${MATCHED1_URL}/?some-other-query=234`)
    expect(result.status).toEqual(200)
  })

  test('handle POST for new route url by basic-authentication', async () => {
    const result = await handleRequest(
      new Request(`/api/users?some-other-query=234`, {
        headers: {
          'content-type': 'application/json',
          Authorization: BASIC_AUTHEN_BOB,
        },
        method: 'POST',
        body: JSON.stringify(BODY_POST),
      }),
    )
    expect(result.url).toEqual(`${MATCHED2_URL}/api/users?some-other-query=234`)
    expect(result.status).toEqual(201)
    const response = (await result.json()) as Record<string, string>
    expect(response['name']).toEqual('morpheus')
    expect(response['job']).toEqual('leader')
  })
})
