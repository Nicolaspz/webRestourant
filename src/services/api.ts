// services/apiClients.ts
import axios, { type AxiosInstance } from 'axios';
import { parseCookies } from 'nookies';
import { API_BASE_URL } from '../../config'; 

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

  return client;
};

export function setupAPIClient(ctx?: any) {
  if (typeof window === 'undefined' || ctx) return createAPIClient(ctx);
  if (!browserClient) browserClient = createAPIClient();
  return browserClient;
}

export const api = setupAPIClient();
