declare global {
  const DEFAULT_KEY: string;
  const QUERY_PARAMETER: string;
  const USE_BASIC_AUTHORIZATION_HEADER: string;
}

import { getRoute } from "./cache";

/**
 * Parse HTTP Basic Authorization value.
 * @param {Request} request
 * @throws {BadRequestException}
 * @returns {{ user: string, pass: string }}
 */
const basicAuthentication = (request: Request) => {
  const Authorization = request.headers.get('Authorization') as string;

  const [scheme, encoded] = Authorization.split(' ');

  // The Authorization header must start with Basic, followed by a space.
  if (!encoded || scheme !== 'Basic') {
    return {};
  }

  // Decodes the base64 value and performs unicode normalization.
  // @see https://datatracker.ietf.org/doc/html/rfc7613#section-3.3.2 (and #section-4.2.2)
  // @see https://dev.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
  const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  const decoded = new TextDecoder().decode(buffer).normalize();

  // The username & password are split by the first colon.
  //=> example: "username:password"
  const index = decoded.indexOf(':');

  // The user & password are split by the first colon and MUST NOT contain control characters.
  // @see https://tools.ietf.org/html/rfc5234#appendix-B.1 (=> "CTL = %x00-1F / %x7F")
  if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
    return {};
  }

  return {
    user: decoded.substring(0, index),
    pass: decoded.substring(index + 1),
  };
}

const getRouteBasedOnRequestParams = async (request: Request) => {
  const url = new URL(request.url);

  // Assuming your GET parameter is "param" (i.e. ?param=value)
  const qs_val = url.searchParams.get(QUERY_PARAMETER);
  if (qs_val) {
    const route = await getRoute(url.hostname, qs_val);
    if (route)
      return route.url;
  }

  if (USE_BASIC_AUTHORIZATION_HEADER === 'true' && request.headers.has('Authorization')) {
    const { user } = basicAuthentication(request);
    if (user) {
      const route = await getRoute(url.hostname, user);
      if (route)
        return route.url;
    }
  }

  const route = await getRoute(url.hostname, DEFAULT_KEY);
  return route ? route.url : undefined;
}

function isRoutingInfoRequest(pathname: string): boolean {
  const i = pathname.indexOf('_routing_info');
  return i >= 0 && i <= 1;
}

/**
 * Proxy the request to the appropriate backend server based on configuration in KV database
 * 
 * @param {Request} request
 */
export async function handleRequest(request: Request): Promise<Response> {
  try {
    const urlToRoute = await getRouteBasedOnRequestParams(request);

    if (!urlToRoute) {
      return new Response('No route found', {
        status: 403
      });
    }

    // forward the request to the origin server with the submitted POST data and append an extra header

    const method = request.method;
    const request_headers = request.headers;
    const new_request_headers = new Headers(request_headers);
    const url = new URL(urlToRoute);

    const requestUrl = new URL(request.url)
    url.pathname = requestUrl.pathname
    url.search = requestUrl.search

    if (isRoutingInfoRequest(requestUrl.pathname)) {
      return new Response(urlToRoute, { status: 200 });
    }

    new_request_headers.set('Referer', request.url);
    new_request_headers.set('Host', url.hostname);

    const requestOptions: RequestInitializerDict = {
      method: method,
      headers: new_request_headers
    };

    if (method === 'POST' || method === 'PUT') {
      // Do we really have to parse the request body?
      // We can pass it as is, since the correct content-type is already in the headers.
      // Use the stream version, so very large are handled without large memory usage.
      requestOptions.body = request.body;
      // const body = await readRequestBody(request);
      // requestOptions = Object.assign(requestOptions, { body });
    }
    const response = await fetch(
      decodeURIComponent(url.origin + url.pathname + requestUrl.search),
      requestOptions);
    return response;
  } catch (err) {
    return new Response(`error!: ${err}`, { status: 500 }); // return 500 Status with Error
  }
} 
