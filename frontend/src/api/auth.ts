import { request } from './client';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    return await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      token: null,
      errorMessage: 'Login failed',
    });
  } catch (error: any) {
    throw new Error(error.message || 'An unexpected error occurred during login.');
  }
};

export const register = async (username: string, email: string, password: string): Promise<LoginResponse> => {
  try {
    return await request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: { username, email, password },
      token: null,
      errorMessage: 'Registration failed',
    });
  } catch (error: any) {
    throw new Error(error.message || 'An unexpected error occurred during registration.');
  }
};

/** Exchange a valid token for a fresh one. */
export const refreshToken = async (token: string): Promise<{ token: string }> =>
  request<{ token: string }>('/auth/refresh', { method: 'POST', token });
