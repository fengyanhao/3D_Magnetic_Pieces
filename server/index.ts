interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

function withHtmlCacheHeaders(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return withHtmlCacheHeaders(assetResponse);
    }

    const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
    if (!acceptsHtml) return assetResponse;

    const indexUrl = new URL(request.url);
    indexUrl.pathname = '/index.html';
    return withHtmlCacheHeaders(await env.ASSETS.fetch(new Request(indexUrl, request)));
  },
};
