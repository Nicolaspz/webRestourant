"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, CheckCircle, ArrowLeft } from "lucide-react";
import { api } from "@/services/apiClients";
import { toast } from "react-toastify";
import Image from "next/image";
import Link from "next/link";
import logoImg from '../../../../public/Logo.png';

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nif, setNif] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orgId, setOrgId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("🚀 Enviando dados de registo:", { name, email, phone });
      const response = await api.post("/register-organization", {
        name,
        email: email || undefined,
        phone,
        nif: nif || undefined,
        address: address || undefined
      });

      console.log("✅ Resposta do backend:", response.data);

      if (response.data.success) {
        const organizationId = response.data.organizationId;
        setOrgId(organizationId);
        setSubmitted(true);
        toast.success("Organização registada! Verifique o seu telemóvel.");

        // Redirecionamento Automático após 2.5 segundos
        setTimeout(() => {
          router.push(`/verify-organization?orgId=${organizationId}&phone=${phone}`);
        }, 2500);

        // Em desenvolvimento, mostrar o código de verificação
        if (response.data.verificationCode) {
          console.log("🔢 Código de verificação (DEV):", response.data.verificationCode);
        }
      }
    } catch (err: any) {
      console.error("❌ Erro ao registar organização:", err);
      const errorMsg = err.response?.data?.error || "Erro ao registar organização";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <title>Criar Organização | Serve Fixe</title>

      {/* Left side — barTender image */}
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
              Crie a sua organização e comece a usar o Serve Fixe em minutos.
            </p>
          </div>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 relative">
        {/* Mobile background */}
        <div className="lg:hidden absolute inset-0">
          <Image src="/barTender.jpg" alt="" fill className="object-cover" quality={60} />
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <Image src={logoImg} alt="Serve Fixe" width={44} height={44} className="rounded-lg" />
            <span className="text-xl font-bold text-gray-900">Serve Fixe</span>
          </div>

          {!submitted ? (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Criar Organização
              </h1>
              <p className="text-gray-500 mb-8">
                Preencha os dados da sua empresa para começar
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-gray-700 font-medium">
                    Nome da Organização *
                  </Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Ex: Restaurante Bela Vista"
                    className="h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgPhone" className="text-gray-700 font-medium">
                    Telemóvel da Organização *
                  </Label>
                  <Input
                    id="orgPhone"
                    type="tel"
                    placeholder="+244 9XX XXX XXX"
                    className="h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgEmail" className="text-gray-700 font-medium">
                    Email da Organização (opcional)
                  </Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    placeholder="contacto@restaurante.com"
                    className="h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgNif" className="text-gray-700 font-medium">
                    NIF (opcional)
                  </Label>
                  <Input
                    id="orgNif"
                    type="text"
                    placeholder="Número de identificação fiscal"
                    className="h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgAddress" className="text-gray-700 font-medium">
                    Endereço (opcional)
                  </Label>
                  <Input
                    id="orgAddress"
                    type="text"
                    placeholder="Rua, bairro, cidade"
                    className="h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      A registar...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5" />
                      Criar Organização
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Já tem conta?{" "}
                <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
                  Fazer Login
                </Link>
              </p>
            </div>
          ) : (
            /* ===== SUCCESS STATE ===== */
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-6">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Verifique o seu telemóvel
              </h2>
              <p className="text-gray-600 mb-2">
                Enviámos um código de verificação para
              </p>
              <p className="text-amber-600 font-semibold mb-6">{phone}</p>
              <p className="text-gray-500 text-sm mb-8">
                Introduza o código recebido por SMS para activar a sua organização e criar o seu utilizador administrador.
              </p>
              <Link
                href={`/verify-organization?orgId=${orgId}&phone=${phone}`}
                className="w-full h-12 bg-amber-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-amber-700 transition-all shadow-md mb-6"
              >
                Introduzir Código
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
              >
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