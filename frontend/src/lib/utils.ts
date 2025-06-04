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
