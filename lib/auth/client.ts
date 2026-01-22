"use client";

const TOKEN_STORAGE_KEY = "sprites_token";
const ORG_STORAGE_KEY = "sprites_org";

export interface AuthUser {
  id: string;
  org: string;
}

export interface TokenValidationResult {
  success: boolean;
  error?: string;
  org?: string;
}

/**
 * Get the stored token from localStorage
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Store token in localStorage
 */
export function storeToken(token: string, org: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(ORG_STORAGE_KEY, org);
}

/**
 * Clear stored token from localStorage
 */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(ORG_STORAGE_KEY);
}

/**
 * Get stored org from localStorage
 */
export function getStoredOrg(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_STORAGE_KEY);
}

/**
 * Submit a Sprites API token for validation and storage
 */
export async function submitToken(token: string): Promise<TokenValidationResult> {
  const response = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  let data: { success?: boolean; org?: string; error?: string } = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    return {
      success: false,
      error: data.error || "Failed to validate token",
    };
  }

  // Store token in localStorage even if org is empty
  if (data.success) {
    storeToken(token, data.org ?? "");
  }

  return {
    success: true,
    org: data.org ?? "",
  };
}

export async function signOut(): Promise<void> {
  clearToken();
  window.location.href = "/";
}

export async function getUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  const org = getStoredOrg();
  
  if (!token || !org) {
    return null;
  }

  // Validate token is still valid by making a request
  const response = await fetch("/api/auth/user", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    // Token is invalid, clear it
    clearToken();
    return null;
  }
  
  const user = await response.json();
  return user;
}

/**
 * Check if user is authenticated (has token in localStorage)
 */
export function isAuthenticated(): boolean {
  return getStoredToken() !== null;
}

