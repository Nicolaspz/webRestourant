"use client";

import { useState, useContext } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/services/apiClients";
import { toast } from "react-toastify";
import Image from "next/image";
import Link from "next/link";
import logoImg from '../../../../public/Logo.png';

export default function LoginPage() {
  const { signIn } = useContext(AuthContext);
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn({ credential, password });
    } catch (err) {
      console.error("Erro ao logar:", err);
    } finally {
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
    <div className="min-h-screen flex">
      <title>Login | Serve Fixe</title>

      {/* Left side — barTender image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/barTender.jpg"
          alt="Bartender"
          fill
          className="object-cover"
          priority
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-amber-900/50" />
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
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 relative">
        {/* Background image for mobile */}
        <div className="lg:hidden absolute inset-0">
          <Image
            src="/barTender.jpg"
            alt=""
            fill
            className="object-cover"
            quality={60}
          />
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md" />
        </div>

        <div className="w-full max-w-md relative z-10">
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
                    placeholder="seu@email.com"
                    className="h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
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
                      placeholder="••••••••"
                      className="h-12 bg-white border-gray-300 pr-12 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-amber-600 hover:text-amber-700 font-medium cursor-pointer"
                      onClick={() => setForgotMode(true)}
                    >
                      Esqueci a senha
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      A Validar...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Ainda não tem conta?{" "}
                <Link href="/register" className="text-amber-600 hover:text-amber-700 font-medium">
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
                    placeholder="seu@email.com"
                    className="h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-md shadow-amber-500/20 disabled:opacity-50"
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
