export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const { timeout = 300000, ...fetchOptions } = options;
  const controller = new AbortController();

  // Ollama can take longer than a normal API (first call loads the model)
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error(
        "The request timed out. Ollama is taking too long to respond.",
      );
    }

    throw new Error(
      `Cannot reach backend at ${API_BASE}. Make sure FastAPI is running.`,
    );
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const body = await response.json();

      if (body?.detail) {
        message = body.detail;
      }
    } catch {
      // Ignore JSON parsing error
    }

    throw new Error(message);
  }

  return response.json();
}

export async function apiFetchJSON(path, body, method = "POST") {
  return apiFetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function apiFetchForm(path, file) {
  const formData = new FormData();

  formData.append("file", file);

  return apiFetch(path, {
    method: "POST",
    body: formData,
  });
}

export async function apiGet(path, options = {}) {
  return apiFetch(path, { method: "GET", cache: "no-store", ...options });
}

export async function apiDelete(path) {
  return apiFetch(path, { method: "DELETE" });
}

/**
 * POST JSON and read a newline-delimited JSON (NDJSON) stream.
 * `onEvent` is called for every parsed line, as soon as it arrives.
 */
export async function apiStreamNDJSON(path, body, onEvent) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Cannot reach backend at ${API_BASE}. Make sure FastAPI is running.`,
    );
  }

  if (!response.ok || !response.body) {
    let message = `Request failed: ${response.status}`;
    try {
      const err = await response.json();
      if (err?.detail) message = err.detail;
    } catch {}
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line));
    }
  }

  if (buffer.trim()) onEvent(JSON.parse(buffer));
}

export default apiFetch;
