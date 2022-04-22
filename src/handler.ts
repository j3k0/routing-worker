import { getRoute } from "./cache";
import { DEFAULT_KEY, QUERY_PARAMETER, USE_BASIC_AUTHORIZATION_HEADER } from "./constants";

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
  if (!qs_val && !USE_BASIC_AUTHORIZATION_HEADER) {
    const route = await getRoute(DEFAULT_KEY);
    return route ? route.url : undefined;
  }

  if (qs_val) {
    const route = await getRoute(qs_val);
    if (!route && !USE_BASIC_AUTHORIZATION_HEADER) {
      const route = await getRoute(DEFAULT_KEY);
      return route ? route.url : undefined;
    }

    if (route)
      return route.url;
  }

  if (USE_BASIC_AUTHORIZATION_HEADER && request.headers.has('Authorization')) {
    const { user } = basicAuthentication(request);
    if (!user) {
      const route = await getRoute(DEFAULT_KEY);
      return route ? route.url : undefined;
    }


    const route = await getRoute(user);
    if (!route) {
      const route = await getRoute(DEFAULT_KEY);
      return route ? route.url : undefined;
    }

    if (route)
      return route.url;
  }

  const route = await getRoute(DEFAULT_KEY);
  return route ? route.url : undefined;
}

const readRequestBody = async (request: Request) => {
  const { headers } = request;
  const contentType = headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return JSON.stringify(await request.json());
  } else if (contentType.includes('application/text')) {
    return request.text();
  } else if (contentType.includes('text/html')) {
    return request.text();
  } /*else if (contentType.includes('form')) {
    const formData = await request.formData();
    const body = {};
    for (const entry of formData.entries()) {
      body[entry[0]] = entry[1];
    }
    return JSON.stringify(body);
  }*/ else {
    // Perhaps some other type of data was submitted in the form
    // like an image, or some other binary data.
    return 'a file';
  }
}

/**
 * Respond with hello worker text
 * @param {Request} request
 */
export async function handleRequest(request: Request): Promise<Response> {

  const urlToRoute = await getRouteBasedOnRequestParams(request);

  if (!urlToRoute) {
    return new Response('No route found', {
      status: 403
    });
  }

  try {
    // forward the request to the origin server with the submitted POST data and append an extra header

    const method = request.method;
    const request_headers = request.headers;
    const new_request_headers = new Headers(request_headers);
    const url = new URL(urlToRoute);

    const requestUrl = new URL(request.url);

    new_request_headers.set('Referer', url.protocol + '//' + url.hostname);

    let requestOptions = {
      method: method,
      headers: new_request_headers
    };

    if (method == 'POST') {
      const body = await readRequestBody(request);
      requestOptions = Object.assign(requestOptions, { body });
    }

    const response = await fetch(decodeURIComponent(url.href + requestUrl.search), requestOptions);
    return response;
  } catch (err) {
    return new Response(`error!: ${err}`, { status: 500 }); // return 500 Status with Error
  }
} 