import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function handleUnauthorized() {
  localStorage.removeItem('token'); // Clear the token directly
  localStorage.removeItem('user'); // Clear user data as well
  window.location.href = '/login'; // Redirect to login page
}

export interface TokenPayload {
  exp?: number;
  id?: string;
}

/** Decode a JWT payload without verifying the signature (client-side only, for expiry checks). */
export function getTokenPayload(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}
