import { request } from './client';

export const updateTimezone = async (timezone: string, token: string) =>
  request<{ message: string; user: { id: string; username: string; email: string; timezone: string } }>(
    '/me/timezone',
    { method: 'PUT', body: { timezone }, token, errorMessage: 'Failed to update timezone' },
  );
