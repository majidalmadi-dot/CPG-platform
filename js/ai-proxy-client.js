/**
 * AI Proxy Client Module
 * Provides a secure interface to the Supabase Edge Function proxy for Gemini API calls.
 * Falls back to direct Gemini calls if proxy is not configured.
 */

// Configuration
let edgeFunctionUrl = null;
let supabaseClient = null;

/**
 * Configure the proxy URL and Supabase client
 * @param {string} url - The Edge Function URL (e.g., https://your-project.supabase.co/functions/v1/ai-proxy)
 * @param {object} supabase - Optional Supabase client instance for getting auth tokens
 */
export function configureProxy(url, supabase = null) {
  edgeFunctionUrl = url;
  supabaseClient = supabase;
  console.log("AI Proxy configured:", { hasUrl: !!url, hasClient: !!supabase });
}

/**
 * Get the authentication token from Supabase
 * @returns {Promise<string|null>} The JWT token or null if not authenticated
 */
async function getAuthToken() {
  if (!supabaseClient) {
    console.warn("Supabase client not configured");
    return null;
  }

  try {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

/**
 * Call the Gemini API through the proxy
 * @param {string} systemPrompt - System instruction for the model
 * @param {string} userMessage - The user's message/prompt
 * @param {Function} onChunk - Callback for each streamed chunk
 * @param {Function} onDone - Callback when streaming is complete
 * @param {Function} onError - Callback for errors
 * @param {object} options - Additional options (model, generationConfig, etc.)
 */
export async function callAI(
  systemPrompt,
  userMessage,
  onChunk,
  onDone,
  onError,
  options = {}
) {
  const {
    model = "gemini-2.0-flash",
    generationConfig = null,
    directCallFallback = true,
  } = options;

  // If proxy is not configured and fallback is enabled, use direct call
  if (!edgeFunctionUrl && directCallFallback) {
    console.log("Edge Function URL not configured, falling back to direct call");
    return callGeminiDirect(
      systemPrompt,
      userMessage,
      onChunk,
      onDone,
      onError,
      { model, generationConfig }
    );
  }

  // Build the request body
  const requestBody = {
    model,
    system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : null,
    contents: [
      {
        parts: [{ text: userMessage }],
      },
    ],
  };

  if (generationConfig) {
    requestBody.generationConfig = generationConfig;
  }

  try {
    // Get auth token
    const token = await getAuthToken();
    if (!token) {
      const error = new Error("Not authenticated. Please log in first.");
      onError(error);
      return;
    }

    // Make the request to the Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      onError(error);
      return;
    }

    // Handle the SSE stream
    await handleSSEStream(response, onChunk, onDone, onError);
  } catch (error) {
    console.error("AI Proxy error:", error);
    onError(error);
  }
}

/**
 * Handle Server-Sent Events stream
 * @private
 */
async function handleSSEStream(response, onChunk, onDone, onError) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          processSSELine(buffer, onChunk);
        }
        onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Process complete lines, keep incomplete line in buffer
      for (let i = 0; i < lines.length - 1; i++) {
        processSSELine(lines[i], onChunk);
      }
      buffer = lines[lines.length - 1];
    }
  } catch (error) {
    console.error("Stream error:", error);
    onError(error);
  } finally {
    reader.releaseLock();
  }
}

/**
 * Process a single SSE line
 * @private
 */
function processSSELine(line, onChunk) {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return; // Skip empty lines
  }

  if (trimmedLine.startsWith(":")) {
    return; // Skip comments
  }

  if (trimmedLine.startsWith("data: ")) {
    const data = trimmedLine.slice(6);

    try {
      const parsed = JSON.parse(data);
      onChunk(parsed);
    } catch (error) {
      console.warn("Failed to parse SSE data:", data, error);
    }
  }
}

/**
 * Direct Gemini API call (fallback when proxy is not available)
 * Requires GEMINI_API_KEY to be exposed in the client (security risk)
 * @private
 */
async function callGeminiDirect(
  systemPrompt,
  userMessage,
  onChunk,
  onDone,
  onError,
  { model, generationConfig }
) {
  const apiKey = window.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "Gemini API key not configured. Please set up the Edge Function proxy."
    );
    onError(error);
    return;
  }

  const requestBody = {
    system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : null,
    contents: [
      {
        parts: [{ text: userMessage }],
      },
    ],
  };

  if (generationConfig) {
    requestBody.generationConfig = generationConfig;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.error?.message || `HTTP ${response.status}`
      );
      error.status = response.status;
      onError(error);
      return;
    }

    await handleSSEStream(response, onChunk, onDone, onError);
  } catch (error) {
    console.error("Direct Gemini API error:", error);
    onError(error);
  }
}

/**
 * Utility function to extract text from streamed Gemini response chunks
 * @param {object} chunk - The Gemini API response chunk
 * @returns {string} The text content, or empty string if not found
 */
export function extractTextFromChunk(chunk) {
  try {
    const candidates = chunk.candidates || [];
    if (candidates.length === 0) return "";

    const content = candidates[0].content || {};
    const parts = content.parts || [];

    return parts.map((part) => part.text || "").join("");
  } catch (error) {
    console.warn("Error extracting text from chunk:", error);
    return "";
  }
}

/**
 * Utility function to check if streaming is complete
 * @param {object} chunk - The Gemini API response chunk
 * @returns {boolean} True if this is the final chunk
 */
export function isStreamingComplete(chunk) {
  try {
    const candidates = chunk.candidates || [];
    if (candidates.length === 0) return false;

    const finishReason = candidates[0].finishReason;
    return finishReason && finishReason !== "RECITATION";
  } catch (error) {
    console.warn("Error checking stream completion:", error);
    return false;
  }
}

export default {
  configureProxy,
  callAI,
  extractTextFromChunk,
  isStreamingComplete,
};