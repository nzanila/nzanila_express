import apiWorker from "./worker";

type Env = Parameters<typeof apiWorker.fetch>[1];

const SELLER_ROUTES = [
  /^\/api\/health$/,
  /^\/api\/storefront-templates$/,
  /^\/api\/stores(?:\/.*)?$/,
  // Product editing is handled by the shared worker's PATCH /api/new-products/:id route.
  /^\/api\/new-products\/\d+$/,
  /^\/api\/new-products\/\d+\/pricing$/,
  /^\/api\/sellers\/\d+\/profile$/,
  /^\/api\/supplier(?:\/.*)?$/,
  /^\/api\/orders\/\d+(?:\/status)?$/,
];

function json(data: unknown, status: number): Response {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Seller-Id",
    },
  });
}

function preflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Seller-Id",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return preflight();
    }

    const { pathname } = new URL(request.url);
    if (!SELLER_ROUTES.some((route) => route.test(pathname))) {
      return json({ error: "Not found" }, 404);
    }

    return apiWorker.fetch(request, env);
  },
};
