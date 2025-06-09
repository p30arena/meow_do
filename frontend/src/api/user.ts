import { API_BASE_URL } from '../config';
import { handleUnauthorized } from '../lib/utils';

export const updateTimezone = async (timezone: string, token: string) => {
  const response = await fetch(`${API_BASE_URL}/me/timezone`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ timezone }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update timezone');
  }

  return response.json();
};
