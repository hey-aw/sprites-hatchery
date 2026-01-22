"use client";

import { getStoredToken } from "./client";

/**
 * Fetch with automatic token injection
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
