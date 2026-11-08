export const API_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:3001');
