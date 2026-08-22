/**
 * Makes the Render API appear under this Pages site's /api path. Browser requests stay same-origin,
 * allowing secure authentication cookies to work without depending on third-party-cookie support.
 */
export async function onRequest(context) {
    const apiOrigin = context.env.API_ORIGIN;

    if (typeof apiOrigin !== "string" || apiOrigin.length === 0) {
        return new Response("API proxy is not configured.", { status: 500 });
    }

    const requestUrl = new URL(context.request.url);
    const pathSegments = context.params.path;
    const path = Array.isArray(pathSegments)
        ? pathSegments.join("/")
        : (pathSegments ?? "");
    const upstreamUrl = new URL(`/api/${path}`, apiOrigin);
    upstreamUrl.search = requestUrl.search;

    // Reusing the incoming request keeps its method, body, cookies, and relevant headers intact.
    // Returning the upstream response unchanged also preserves authentication Set-Cookie headers.
    return fetch(new Request(upstreamUrl, context.request));
}
