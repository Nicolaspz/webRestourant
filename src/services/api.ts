// services/apiClients.ts
import axios, { type AxiosInstance } from 'axios';
import { parseCookies } from 'nookies';
import { API_BASE_URL } from '../../config'; 
import { readCache } from './readCache';

let browserClient: AxiosInstance | null = null;

const createAPIClient = (ctx?: any) => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  });

  // Lê o token no momento do pedido. Isto permite reutilizar uma única instância
  // no browser sem manter tokens antigos depois de login/logout.
  client.interceptors.request.use(request => {
    const token = parseCookies(ctx)['@servFixe.token'];
    if (token) request.headers.Authorization = `Bearer ${token}`;
    else delete request.headers.Authorization;
    return request;
  });

  client.interceptors.response.use(response => {
    if (response.config.method && response.config.method !== 'get') readCache.clear();
    return response;
  }, error => {
    if ([401, 403].includes(error.response?.status)) readCache.clear();
    return Promise.reject(error);
  });

  return client;
};

export function setupAPIClient(ctx?: any) {
  if (typeof window === 'undefined' || ctx) return createAPIClient(ctx);
  if (!browserClient) browserClient = createAPIClient();
  return browserClient;
}

export const api = setupAPIClient();

// Explicit opt-in: never cache payments, stock availability or fiscal actions.
export async function cachedGet<T = any>(url: string, params: Record<string, string> = {}, ttl = 30000, force = false): Promise<{ data: T }> {
  const load = () => api.get<T>(url, { params, timeout: 15000 }).then(response => response.data);
  if (typeof window === 'undefined') return { data: await load() };
  const token = parseCookies()['@servFixe.token'];
  if (!token) { readCache.clear(); return { data: await load() }; }
  const key = JSON.stringify([API_BASE_URL, url, Object.entries(params).sort()]);
  return { data: await readCache.get(token, key, ttl, load, force) };
}
