import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { setAuthToken } from '../api/auth';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function handleUnauthorized() {
  setAuthToken(null); // Clear the token
  window.location.href = '/login'; // Redirect to login page
}
