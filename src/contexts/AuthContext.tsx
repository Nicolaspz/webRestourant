'use client'
import { createContext, ReactNode, useState, useEffect, useCallback, Suspense } from "react";
import { destroyCookie, setCookie, parseCookies } from 'nookies'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { api } from '../services/apiClients';

type AuthContextData = {
  user: UserProps | null;
  isAuthenticated: boolean;
  signIn: (credentials: SignInProps) => Promise<void>;
  signOut: () => void;
  signUp: (credentials: SignUpProps) => Promise<void>;
}

type UserProps = {
  id?: string;
  name?: string;
  email?: string;
  token?: string;
  role?: string;
  telefone?: string;
  organizationId?: string;
  user_name?: string;
  address?: string | null;
  imageLogo?: string | null;
  nif?: string | null;
  activeLicense?: string | boolean | null;
  name_org?: string;
  margin_stock?: string;
  margin_dish?: string;
}

type SignInProps = {
  credential: string;
  password: string;
}

type SignUpProps = {
  id: string;
  name: string;
  email: string;
  role: string;
  telefone: string;
  organizationId: string;
  user_name: string;
  address?: string,
  imageLogo: string,
  nif: string,
  activeLicense: string,
  name_org: string
}

type AuthProviderProps = {
  children: ReactNode;
}

export const AuthContext = createContext({} as AuthContextData)

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const [user, setUser] = useState<UserProps | null>(null);
  const isAuthenticated = !!user?.token;

  const inactivityTimeout = 15 * 60 * 1000;
  let inactivityTimer: NodeJS.Timeout;

  function signOut() {
    try {
      console.log('🚪 Fazendo logout...');

      // Limpa cookies com configuração correta
      const isProduction = process.env.NODE_ENV === 'production';

      destroyCookie(undefined, '@servFixe.token', { path: '/' });
      destroyCookie(undefined, '@servFixe.role', { path: '/' });
      destroyCookie(undefined, '@servFixe.organizationId', { path: '/' });

      // Limpa via document.cookie para garantir (sem restrição de domínio)
      document.cookie = '@servFixe.token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = '@servFixe.role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = '@servFixe.organizationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      // Limpa o estado
      setUser(null);
      delete api.defaults.headers['Authorization'];

      console.log('✅ Logout completo - cookies limpos');

      // Só redireciona para login se estiver no dashboard
      const pathname = window.location.pathname;
      if (pathname.startsWith('/dashboard')) {
        router.push('/login');
      } else {
        console.log('🔓 Rota pública — logout sem redirecionar');
      }

    } catch (error) {
      console.error("Erro ao deslogar:", error);
      const pathname = window.location.pathname;
      if (pathname.startsWith('/dashboard')) {
        router.push('/login');
      }
    }
  }

  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      // Só faz logout por inatividade em rotas do dashboard
      const pathname = window.location.pathname;
      if (pathname.startsWith('/dashboard')) {
        signOut();
      }
    }, inactivityTimeout);
  };

  const handleUserInteraction = () => {
    resetInactivityTimer();
  };

  const checkToken = useCallback(async () => {
    try {
      const { '@servFixe.token': token, '@servFixe.role': role } = parseCookies();

      console.log('🔍 Verificando token:', {
        token: token ? token.substring(0, 10) + '...' : null,
        role
      });

      if (!token) {
        console.log('❌ Sem token');
        return;
      }

      api.defaults.headers['Authorization'] = `Bearer ${token}`;
      const response = await api.get('/me');

      const { id, name, email, role: userRole, organizationId, user_name } = response.data;
      const orgData = response.data.Organization || {};

      setUser({
        id,
        name,
        email,
        role: userRole,
        user_name,
        token,
        organizationId,
        address: orgData.address || null,
        imageLogo: orgData.imageLogo || null,
        nif: orgData.nif || null,
        activeLicense: orgData.activeLicense || null,
        name_org: orgData.name || ''
      });

      console.log('✅ Token válido, user setado:', { role: userRole });

    } catch (error) {
      console.error("❌ Erro ao verificar token:", error);

      const { '@servFixe.token': token } = parseCookies();
      if (token) {
        // Só redireciona para login se estiver em rota privada (/dashboard)
        const pathname = window.location.pathname;
        if (pathname.startsWith('/dashboard')) {
          signOut();
        } else {
          // Em rotas públicas, apenas limpar cookies inválidos sem redirecionar
          console.log('🔓 Rota pública — limpando token expirado sem redirecionar');
          destroyCookie(undefined, '@servFixe.token', { path: '/' });
          destroyCookie(undefined, '@servFixe.role', { path: '/' });
          destroyCookie(undefined, '@servFixe.organizationId', { path: '/' });
          document.cookie = '@servFixe.token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = '@servFixe.role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = '@servFixe.organizationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          setUser(null);
          delete api.defaults.headers['Authorization'];
        }
      }
    }
  }, []);


  useEffect(() => {
    checkToken();

    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('mousedown', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('mousedown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      clearTimeout(inactivityTimer);
    };
  }, [checkToken]);

  async function signIn({ credential, password }: SignInProps) {
    try {
      const response = await api.post('/session', { credential, password });
      const { id, name, email, role, organizationId, user_name, token } = response.data;
      const orgData = response.data.Organization || {};

      toast.success("Login feito com sucesso!");

      // 🔐 CONFIGURAÇÃO CORRETA PARA PRODUÇÃO (HTTPS)
      const isProduction = process.env.NODE_ENV === 'production';

      setCookie(undefined, '@servFixe.token', token, {
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        path: "/",
        secure: isProduction,
        sameSite: "lax"
      });

      setCookie(undefined, '@servFixe.role', role, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        secure: isProduction,
        sameSite: "lax"
      });

      setCookie(undefined, '@servFixe.organizationId', organizationId, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        secure: isProduction,
        sameSite: "lax"
      });

      // Atualiza estado com user + token
      setUser({
        id,
        name,
        email,
        role,
        user_name,
        token,
        organizationId,
        address: orgData.address || null,
        imageLogo: orgData.imageLogo || null,
        nif: orgData.nif || null,
        activeLicense: orgData.activeLicense || null,
        name_org: orgData.name || ''
      });

      console.log("✅ Login realizado:", { token: token?.substring(0, 10) + '...', role });

      // Redireciona baseado na role
      if (role?.toUpperCase() === 'CAIXA') {
        router.push("/dashboard/caixa");
      } else if (role?.toUpperCase() === 'GARCON') {
        router.push("/dashboard/mesa");
      } else if (role?.toUpperCase() === 'COZINHA') {
        router.push("/dashboard/cozinha");
      } else if (role?.toUpperCase() === 'BAR') {
        router.push("/dashboard/bar");
      } else {
        router.push("/dashboard");
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Erro inesperado, tente novamente.";
      toast.error(errorMessage);
    }
  }
  async function signUp({ name, email, role, user_name }: SignUpProps) {
    try {
      await api.post('/users', {
        name,
        email,
        role,
        user_name
      });

      toast.success("Cadastrado com sucesso!");
      router.push('/sign-in');
    } catch (err) {
      toast.error("Erro ao se Cadastrar");
    }
  }

  return (
    <Suspense>
      <AuthContext.Provider value={{ user, isAuthenticated, signIn, signOut, signUp }}>
        {children}
      </AuthContext.Provider>
    </Suspense>
  )
}