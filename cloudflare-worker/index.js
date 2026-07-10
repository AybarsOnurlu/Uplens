export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const { license_key } = body;

      if (!license_key) {
        return createCorsResponse({ error: "license_key is required" }, 400);
      }

      // Prepare request to Lemon Squeezy
      const formData = new URLSearchParams();
      formData.append('license_key', license_key);

      const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          // Optional: If you want strict store-level validation, you can pass your API key or Signing Secret here if needed.
          // The user mentioned LEMON_SQUEEZY_SIGNING_SECRET
          "Authorization": env.LEMON_SQUEEZY_SIGNING_SECRET ? `Bearer ${env.LEMON_SQUEEZY_SIGNING_SECRET}` : "",
        },
        body: formData.toString()
      });

      const data = await response.json();
      
      // Return the validation result securely to the extension
      return createCorsResponse({
        valid: data.valid || false,
        error: data.error || null,
        meta: data.meta || {}
      }, 200);

    } catch (err) {
      return createCorsResponse({ error: "Internal Server Error", details: err.message }, 500);
    }
  },
};

function createCorsResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
