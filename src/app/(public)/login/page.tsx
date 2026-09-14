"use client";

import { useState, useContext, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/services/apiClients";
import { toast } from "react-toastify";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import logoImg from '../../../../public/Logo.png';

export default function LoginPage() {
  const { signIn } = useContext(AuthContext);
  const router = useRouter();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    router.prefetch('/dashboard');
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'inactivity') {
      toast.info('A sessão terminou após 15 minutos sem atividade. Inicie sessão novamente.', {
        toastId: 'session-ended-by-inactivity',
      });
      window.history.replaceState({}, '', '/login');
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn({ credential, password });
    } catch (err) {
      console.error("Erro ao logar:", err);
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { credential });
      toast.success("Enviamos um link de recuperação para o seu email.");
      setForgotMode(false);
    } catch (err) {
      toast.error("Erro ao enviar email de recuperação.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sf-auth sf-auth-split">
      <title>Login | Serve Fixe</title>

      {/* Left side — barTender image (hidden on mobile) */}
      <div className="sf-auth-story hidden lg:flex relative">
        <Image
          src="/barTender.jpg"
          alt="Bartender"
          fill
          className="object-cover"
          priority
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10243d] via-[#10243d]/65 to-[#10243d]/20" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white mb-3">
              Gerir o seu restaurante nunca foi tão fácil
            </h2>
            <p className="text-white/70 text-lg">
              Pedidos, stock, cozinha e facturação — tudo num único painel.
            </p>
          </div>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="sf-auth-main">
        {/* Background image for mobile */}
        <div className="hidden">
          <Image
            src="/barTender.jpg"
            alt=""
            fill
            className="object-cover"
            quality={60}
          />
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md" />
        </div>

        <div className="sf-auth-form w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <Image
              src={logoImg}
              alt="Serve Fixe"
              width={44}
              height={44}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-gray-900">Serve Fixe</span>
          </div>

          {!forgotMode ? (
            /* ===== LOGIN FORM ===== */
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-500 mb-8">
                Introduza as suas credenciais para aceder ao painel
              </p>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="credential" className="text-gray-700 font-medium">
                    Email ou Telefone
                  </Label>
                  <Input
                    id="credential"
                    type="text"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="seu@email.com"
                    className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-12 bg-white border-gray-300 pr-12 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-blue-700 hover:text-blue-800 font-medium cursor-pointer"
                      onClick={() => setForgotMode(true)}
                    >
                      Esqueci a senha
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#2459a6] text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-[#1d4887] transition-all duration-300 shadow-md shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      A entrar no painel...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Ainda não tem conta?{" "}
                <Link href="/register" className="text-blue-700 hover:text-blue-800 font-medium">
                  Registar-se
                </Link>
              </p>
            </div>
          ) : (
            /* ===== FORGOT PASSWORD FORM ===== */
            <div>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </button>

              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Recuperar senha
              </h1>
              <p className="text-gray-500 mb-8">
                Informe o seu email para receber o link de redefinição
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#2459a6] text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-[#1d4887] transition-all duration-300 shadow-md shadow-blue-900/10 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar link de recuperação"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
