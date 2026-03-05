// config.js - VERSÃO CORRIGIDA
export const getApiBaseUrl = () => {
    // Se estiver no servidor (SSR) ou ambiente sem window
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || process.env.BASE_API_URL || 'http://localhost:3333';
    }

    // No navegador
    const hostname = window.location.hostname;
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL;

    // Se houver uma URL de API definida no ambiente, usa ela (ex: EC2 no .env)
    if (envApiUrl && envApiUrl !== '') {
        return envApiUrl;
    }

    // Se for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3333';
    }

    // Se for um IP (acesso via rede local)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
        return `http://${hostname}:3333`;
    }

    // Em produção na Vercel (Proxy /api)
    return '/api';
};

export const API_BASE_URL = getApiBaseUrl();
console.log('API Base URL (corrigida):', API_BASE_URL);