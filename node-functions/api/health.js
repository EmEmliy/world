function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      ...(init.headers || {}),
    },
  });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export function onRequestGet(context) {
  return json({
    status: 'ok',
    runtime: 'edgeone-node-functions',
    timestamp: Date.now(),
    hasApiKey: Boolean((context.env || {}).KIMI_API_KEY || process.env.KIMI_API_KEY),
  });
}
