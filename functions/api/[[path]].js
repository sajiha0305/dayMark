export async function onRequest({ request, env, params }) {
  if (!env.API_ORIGIN) {
    return Response.json({ message: 'The Daymark API is not configured yet.' }, { status: 503 });
  }

  const sourceUrl = new URL(request.url);
  const pathSegments = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const targetUrl = new URL(`/api/${pathSegments.join('/')}`, env.API_ORIGIN);
  targetUrl.search = sourceUrl.search;

  return fetch(new Request(targetUrl, request));
}