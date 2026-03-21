import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode } from "https://deno.land/std@0.168.0/encoding/jwt.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET");
const MAX_REQUESTS_PER_MINUTE = 5;

// In-memory rate limit store (will reset on function reload)
// For production, use Supabase Realtime or Redis
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(userId: string): string {
  return `rate_limit:${userId}`;
}

function checkRateLimit(userId: string): boolean {
  const key = getRateLimitKey(userId);
  const now = Date.now();

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
    return true;
  }

  const record = rateLimitStore.get(key)!;

  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  record.count++;
  return true;
}

function verifyJWT(token: string): { sub?: string; error?: string } {
  try {
    // Remove "Bearer " prefix if present
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    // For Supabase, we'll verify the basic structure
    // In production, use proper JWT verification with SUPABASE_JWT_SECRET
    const parts = cleanToken.split(".");
    if (parts.length !== 3) {
      return { error: "Invalid token format" };
    }

    // Decode the payload (second part)
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0)
        )
      )
    );

    if (!payload.sub) {
      return { error: "Token missing sub claim" };
    }

    return { sub: payload.sub };
  } catch (error) {
    return { error: `Token verification failed: ${error.message}` };
  }
}

function corsHeaders(origin: string): Record<string, string> {
  // Allow GitHub Pages and localhost
  const allowedOrigins = [
    "https://ksumc-cpg.github.io",
    "http://localhost:8000",
    "http://localhost:3000",
  ];

  const isAllowed = allowedOrigins.some((allowed) => allowed === origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  // Verify authentication
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  const { sub, error: authError } = verifyJWT(authHeader);
  if (authError || !sub) {
    return new Response(
      JSON.stringify({ error: authError || "Invalid token" }),
      {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  // Check rate limit
  if (!checkRateLimit(sub)) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded. Max 5 requests per minute.",
      }),
      {
        status: 429,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  // Verify API key is configured
  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  // Parse request body
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  const { model, system_instruction, contents, generationConfig } = requestBody;

  if (!model || !contents) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: model, contents",
      }),
      {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  // Build the request to Google Gemini API
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  const geminiRequestBody = {
    system_instruction: system_instruction || undefined,
    contents,
    generationConfig: generationConfig || undefined,
  };

  try {
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(
        `Gemini API error: ${geminiResponse.status} - ${errorText}`
      );

      return new Response(
        JSON.stringify({
          error: `Upstream API error: ${geminiResponse.status}`,
        }),
        {
          status: geminiResponse.status,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    // Stream the response back with proper SSE headers
    const responseHeaders = {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };

    return new Response(geminiResponse.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({
        error: `Proxy error: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
}

serve(handleRequest);