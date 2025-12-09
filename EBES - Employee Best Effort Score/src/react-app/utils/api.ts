// Utility function to make authenticated API requests
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const userStr = sessionStorage.getItem('user');
  if (!userStr) {
    throw new Error('Not authenticated');
  }

  const user = JSON.parse(userStr);
  
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': user.id.toString(),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
