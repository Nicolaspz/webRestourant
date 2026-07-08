"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, CheckCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { api } from "@/services/apiClients";
import { toast } from "react-toastify";
import Image from "next/image";
import Link from "next/link";
import logoImg from "../../../../public/Logo.png";

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const [organization, setOrganization] = useState({
    name: "",
    address: "",
  });
  const [admin, setAdmin] = useState({
    name: "",
    email: "",
    phone: "",
    userName: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orgId, setOrgId] = useState("");

  const hasUpperCase = /[A-Z]/.test(admin.password);
  const hasLowerCase = /[a-z]/.test(admin.password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(admin.password);
  const hasMinLength = admin.password.length >= 6;
  const passwordsMatch = admin.password === admin.confirmPassword && admin.password.length > 0;
  const passwordIsValid = hasUpperCase && hasLowerCase && hasSpecialChar && hasMinLength && passwordsMatch;

  function updateOrganization(field: keyof typeof organization, value: string) {
    setOrganization((prev) => ({ ...prev, [field]: value }));
  }

  function updateAdmin(field: keyof typeof admin, value: string) {
    setAdmin((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!passwordIsValid) {
      toast.error("A senha nao cumpre os requisitos ou nao coincide");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/register-organization", {
        name: organization.name,
        address: organization.address || undefined,
        adminName: admin.name,
        adminEmail: admin.email,
        adminPhone: admin.phone,
        user_name: admin.userName,
        password: admin.password,
      });

      if (response.data.success) {
        const organizationId = response.data.organizationId;
        setOrgId(organizationId);
        setSubmitted(true);
        toast.success("Conta criada! Verifique o codigo enviado por SMS.");

        if (response.data.verificationCode) {
          console.log("Codigo de verificacao (DEV):", response.data.verificationCode);
        }

        setTimeout(() => {
          router.push(`/verify-organization?orgId=${organizationId}&phone=${admin.phone}`);
        }, 1800);
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      const errorMsg = apiError.response?.data?.error || "Erro ao criar conta";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <title>Criar Conta | Serve Fixe</title>

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
              Comece a gerir o seu restaurante hoje
            </h2>
            <p className="text-white/70 text-lg">
              Crie o utilizador administrador e a empresa numa unica etapa. O codigo SMS serve apenas para activar a conta.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 relative overflow-y-auto">
        <div className="lg:hidden absolute inset-0">
          <Image src="/barTender.jpg" alt="" fill className="object-cover" quality={60} />
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md" />
        </div>

        <div className="w-full max-w-2xl relative z-10 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Image src={logoImg} alt="Serve Fixe" width={44} height={44} className="rounded-lg" />
            <span className="text-xl font-bold text-gray-900">Serve Fixe</span>
          </div>

          {!submitted ? (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Criar conta
              </h1>
              <p className="text-gray-500 mb-8">
                Preencha os dados principais. Os detalhes da empresa podem ser actualizados depois no dashboard.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nome completo *" id="adminName">
                    <Input
                      id="adminName"
                      value={admin.name}
                      onChange={(e) => updateAdmin("name", e.target.value)}
                      placeholder="Joao da Silva"
                      required
                      className="h-12 bg-white text-gray-900"
                    />
                  </Field>

                  <Field label="Email *" id="adminEmail">
                    <Input
                      id="adminEmail"
                      type="email"
                      value={admin.email}
                      onChange={(e) => updateAdmin("email", e.target.value)}
                      placeholder="joao@email.com"
                      required
                      className="h-12 bg-white text-gray-900"
                    />
                  </Field>

                  <Field label="Telefone *" id="adminPhone">
                    <Input
                      id="adminPhone"
                      type="tel"
                      value={admin.phone}
                      onChange={(e) => updateAdmin("phone", e.target.value)}
                      placeholder="+244 9XX XXX XXX"
                      required
                      className="h-12 bg-white text-gray-900"
                    />
                  </Field>

                  <Field label="Username *" id="userName">
                    <Input
                      id="userName"
                      value={admin.userName}
                      onChange={(e) => updateAdmin("userName", e.target.value)}
                      placeholder="joao.admin"
                      required
                      className="h-12 bg-white text-gray-900"
                    />
                  </Field>

                  <Field label="Nome da empresa *" id="orgName">
                    <Input
                      id="orgName"
                      value={organization.name}
                      onChange={(e) => updateOrganization("name", e.target.value)}
                      placeholder="Restaurante Bela Vista"
                      required
                      className="h-12 bg-white text-gray-900"
                    />
                  </Field>

                  <Field label="Localizacao" id="orgAddress">
                    <Input
                      id="orgAddress"
                      value={organization.address}
                      onChange={(e) => updateOrganization("address", e.target.value)}
                      placeholder="Rua, bairro ou cidade"
                      className="h-12 bg-white text-gray-900"
                    />
                  </Field>

                  <Field label="Senha *" id="password">
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={admin.password}
                        onChange={(e) => updateAdmin("password", e.target.value)}
                        placeholder="Digite a senha"
                        required
                        className="h-12 bg-white pr-12 text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirmar senha *" id="confirmPassword">
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={admin.confirmPassword}
                      onChange={(e) => updateAdmin("confirmPassword", e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className="h-12 bg-white text-gray-900"
                    />
                  </Field>
                </div>

                {admin.password.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <PasswordRule ok={hasUpperCase} text="Maiuscula" />
                    <PasswordRule ok={hasLowerCase} text="Minuscula" />
                    <PasswordRule ok={hasSpecialChar} text="Especial" />
                    <PasswordRule ok={hasMinLength} text="6+ caracteres" />
                  </div>
                )}

                {admin.confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-sm text-red-500">As senhas nao coincidem.</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !passwordIsValid}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      A criar conta...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5" />
                      Criar conta e enviar codigo
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Ja tem conta?{" "}
                <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
                  Fazer Login
                </Link>
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-6">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Verifique o seu telemovel
              </h2>
              <p className="text-gray-600 mb-2">
                Enviamos um codigo de verificacao para
              </p>
              <p className="text-amber-600 font-semibold mb-6">{admin.phone}</p>
              <p className="text-gray-500 text-sm mb-8">
                A empresa e o administrador ja foram criados. Falta apenas activar a conta com o codigo.
              </p>
              <Link
                href={`/verify-organization?orgId=${orgId}&phone=${admin.phone}`}
                className="w-full h-12 bg-amber-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-amber-700 transition-all shadow-md mb-6"
              >
                Introduzir Codigo
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-700 font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

function PasswordRule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600" : "text-gray-400"}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-gray-300"}`} />
      {text}
    </div>
  );
}
