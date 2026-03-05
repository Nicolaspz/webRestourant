// services/apiClients.ts
import axios from 'axios';
import { parseCookies } from 'nookies';
import { API_BASE_URL } from '../../config'; 

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);
  
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${cookies['@servFixe.token']}`
    },
    withCredentials: true, // ← ESSENCIAL
  });

  // Interceptor para debug
  api.interceptors.request.use(request => {
    console.log('🚀 API Request:', {
      url: request.url,
      baseURL: request.baseURL,
      method: request.method,
      withCredentials: request.withCredentials,
      headers: request.headers
    });
    return request;
  });

  return api;
}

export const api = setupAPIClient();