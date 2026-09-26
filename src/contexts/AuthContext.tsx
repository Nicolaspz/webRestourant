'use client'
import { createContext, ReactNode, useState, useEffect, useCallback, useRef, Suspense } from "react";
import { destroyCookie, setCookie, parseCookies } from 'nookies'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { api } from '../services/apiClients';
import { readCache } from '../services/readCache';

type AuthContextData = {
  user: UserProps | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
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

const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
const INACTIVITY_WARNING_DELAY = 14 * 60 * 1000;
const INACTIVITY_TOAST_ID = 'session-inactivity-warning';

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const [user, setUser] = useState<UserProps | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const isAuthenticated = !!user?.token;

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback(() => {
    readCache.clear();
    destroyCookie(undefined, '@servFixe.token', { path: '/' });
    destroyCookie(undefined, '@servFixe.role', { path: '/' });
    destroyCookie(undefined, '@servFixe.organizationId', { path: '/' });
    setUser(null);
    delete api.defaults.headers['Authorization'];
  }, []);

  const signOut = useCallback((reason?: 'inactivity') => {
    try {
      clearSession();
      toast.dismiss(INACTIVITY_TOAST_ID);

      const pathname = window.location.pathname;
      if (pathname.startsWith('/dashboard')) {
        const loginUrl = reason === 'inactivity' ? '/login?reason=inactivity' : '/login';
        router.replace(loginUrl);
      }
    } catch (error) {
      console.error("Erro ao deslogar:", error);
      router.replace('/login');
    }
  }, [clearSession, router]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (inactivityWarningRef.current) clearTimeout(inactivityWarningRef.current);
    toast.dismiss(INACTIVITY_TOAST_ID);

    if (!window.location.pathname.startsWith('/dashboard')) return;

    inactivityWarningRef.current = setTimeout(() => {
      toast.info('A sessão terminará em 1 minuto por inatividade. Interaja com a página para continuar.', {
        toastId: INACTIVITY_TOAST_ID,
        autoClose: false,
      });
    }, INACTIVITY_WARNING_DELAY);

    inactivityTimerRef.current = setTimeout(() => {
      signOut('inactivity');
    }, INACTIVITY_TIMEOUT);
  }, [signOut]);

  const checkToken = useCallback(async () => {
    try {
      const { '@servFixe.token': token, '@servFixe.role': role } = parseCookies();

      if (!token) {
        return;
      }

      api.defaults.headers['Authorization'] = `Bearer ${token}`;
      const response = await api.get('/me', { timeout: 15000 });

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

    } catch (error) {
      console.error("❌ Erro ao verificar token:", error);

      const { '@servFixe.token': token } = parseCookies();
      if (token) {
        // Só redireciona para login se estiver em rota privada (/dashboard)
        const pathname = window.location.pathname;
        if (pathname.startsWith('/dashboard')) {
          signOut();
        } else {
          clearSession();
        }
      }
    } finally {
      setIsInitializing(false);
    }
  }, [clearSession, signOut]);


  useEffect(() => {
    checkToken();

    const handleUserInteraction = () => resetInactivityTimer();
    const interactionEvents: Array<keyof WindowEventMap> = ['mousedown', 'keydown', 'touchstart'];
    interactionEvents.forEach(event => window.addEventListener(event, handleUserInteraction, { passive: true }));

    resetInactivityTimer();

    return () => {
      interactionEvents.forEach(event => window.removeEventListener(event, handleUserInteraction));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (inactivityWarningRef.current) clearTimeout(inactivityWarningRef.current);
    };
  }, [checkToken, resetInactivityTimer]);

  async function signIn({ credential, password }: SignInProps) {
    try {
      const response = await api.post('/session', { credential, password }, { timeout: 20000 });
      const { id, name, email, role, organizationId, user_name, token } = response.data;
      const orgData = response.data.Organization || {};

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

      // Disponibiliza o token imediatamente para qualquer pedido disparado
      // durante a primeira renderização do dashboard. O interceptor também
      // lê o cookie, mas este header evita uma janela em que componentes
      // montados logo após o redirect ainda usam a sessão anterior.
      api.defaults.headers['Authorization'] = `Bearer ${token}`;

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

      // Redireciona baseado na role
      const destination = role?.toUpperCase() === 'CAIXA' ? '/dashboard/caixa'
        : role?.toUpperCase() === 'GARCON' ? '/dashboard/mesa'
          : role?.toUpperCase() === 'COZINHA' ? '/dashboard/cozinha'
            : role?.toUpperCase() === 'BAR' ? '/dashboard/bar'
              : role?.toUpperCase() === 'ECONOMATO' ? '/dashboard/economato'
              : '/dashboard';
      setIsInitializing(false);
      // Inicia a navegação com os cookies recém-gravados, sem reutilizar
      // respostas do dashboard obtidas antes da autenticação.
      window.location.replace(destination);

    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Erro inesperado, tente novamente.";
      toast.error(errorMessage);
      throw err;
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
      router.push('/login');
    } catch (err) {
      toast.error("Erro ao se Cadastrar");
    }
  }

  return (
    <Suspense>
      <AuthContext.Provider value={{ user, isAuthenticated, isInitializing, signIn, signOut, signUp }}>
        {children}
      </AuthContext.Provider>
    </Suspense>
  )
}
