import assert from "node:assert/strict";

export const APP_URL = (process.env.APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
export const BOARD_URL = (process.env.BOARD_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
export const BOARD_TOKEN = process.env.BOARD_TOKEN || "";

export async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { accept: "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  return { response, body };
}

export async function available(base, path = "/health") {
  try {
    const { response } = await request(base, path);
    return response.ok;
  } catch {
    return false;
  }
}

export function hotelsFrom(body) {
  assert.ok(body && typeof body === "object", "search response should be JSON");
  assert.ok(Array.isArray(body.hotels), "search response should contain a hotels array");
  return body.hotels;
}

export function assertJsonError(result, status = 400) {
  assert.equal(result.response.status, status);
  assert.ok(result.body && typeof result.body === "object", "error response should be JSON");
}
