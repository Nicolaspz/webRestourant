"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "@/services/apiClients";
import { toast } from "react-toastify";
import Image from "next/image";
import Link from "next/link";
import logoImg from '../../../../../public/Logo.png';

export default function CreateMasterUserPage() {
    const params = useParams();
    const router = useRouter();
    const organizationId = params.organizationId as string;

    const [orgName, setOrgName] = useState("");
    const [orgLoading, setOrgLoading] = useState(true);
    const [orgError, setOrgError] = useState("");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [telefone, setTelefone] = useState("");
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Validação da senha
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 6;
    const passwordsMatch = password === confirmPassword && password.length > 0;

    // Buscar dados da organização
    useEffect(() => {
        async function fetchOrg() {
            try {
                const response = await api.get(`/organization/${organizationId}`);
                if (response.data.success) {
                    setOrgName(response.data.organization.name);
                }
            } catch (err: any) {
                const msg = err.response?.data?.error || "Organização não encontrada";
                setOrgError(msg);
            } finally {
                setOrgLoading(false);
            }
        }
        fetchOrg();
    }, [organizationId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!hasUpperCase || !hasLowerCase || !hasSpecialChar || !hasMinLength) {
            toast.error("A senha não cumpre os requisitos mínimos");
            return;
        }

        if (!passwordsMatch) {
            toast.error("As senhas não coincidem");
            return;
        }

        setLoading(true);
        try {
            await api.post("/users", {
                name,
                email,
                telefone,
                user_name: userName,
                password,
                organizationId,
                role: "SUPER ADMIN"
            });

            toast.success("Utilizador Admin criado com sucesso!");
            router.push("/login");
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || "Erro ao criar utilizador";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    // Loading org data
    if (orgLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <title>Criar Utilizador | Serve Fixe</title>
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    // Org error
    if (orgError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <title>Erro | Serve Fixe</title>
                <div className="text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{orgError}</h2>
                    <p className="text-gray-500 mb-6">O link poderá estar inválido ou expirado.</p>
                    <Link
                        href="/register"
                        className="text-amber-600 hover:text-amber-700 font-medium"
                    >
                        Registar nova organização
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            <title>Criar Utilizador Master | Serve Fixe</title>

            {/* Left side */}
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
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 mb-4">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            <span className="text-white/90 text-sm">Organização verificada</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-3">
                            Último passo!
                        </h2>
                        <p className="text-white/70 text-lg">
                            Crie o seu utilizador administrador para «{orgName}»
                        </p>
                    </div>
                </div>
            </div>

            {/* Right side — Form */}
            <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 relative overflow-y-auto">
                <div className="lg:hidden absolute inset-0">
                    <Image src="/barTender.jpg" alt="" fill className="object-cover" quality={60} />
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md" />
                </div>

                <div className="w-full max-w-md relative z-10 py-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-6">
                        <Image src={logoImg} alt="Serve Fixe" width={44} height={44} className="rounded-lg" />
                        <div>
                            <span className="text-xl font-bold text-gray-900 block">Serve Fixe</span>
                            <span className="text-sm text-amber-600 font-medium">{orgName}</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        Criar Utilizador Principal
                    </h1>
                    <p className="text-gray-500 mb-6">
                        Este será o administrador principal da organização
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-gray-700 font-medium">Nome Completo *</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="João da Silva"
                                className="h-11 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-700 font-medium">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="joao@email.com"
                                className="h-11 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="telefone" className="text-gray-700 font-medium">Telefone *</Label>
                                <Input
                                    id="telefone"
                                    type="text"
                                    placeholder="+244 9XX XXX XXX"
                                    className="h-11 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                                    value={telefone}
                                    onChange={(e) => setTelefone(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="userName" className="text-gray-700 font-medium">Username *</Label>
                                <Input
                                    id="userName"
                                    type="text"
                                    placeholder="joao.admin"
                                    className="h-11 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-700 font-medium">Senha *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="h-11 bg-white border-gray-300 pr-12 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
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
                            {/* Password validations */}
                            {password.length > 0 && (
                                <div className="grid grid-cols-2 gap-1 mt-2">
                                    <PasswordRule ok={hasUpperCase} text="Maiúscula" />
                                    <PasswordRule ok={hasLowerCase} text="Minúscula" />
                                    <PasswordRule ok={hasSpecialChar} text="Carácter especial" />
                                    <PasswordRule ok={hasMinLength} text="6+ caracteres" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirmar Senha *</Label>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className={`h-11 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900
                  ${confirmPassword.length > 0 && !passwordsMatch ? 'border-red-400' : ''}
                `}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            {confirmPassword.length > 0 && !passwordsMatch && (
                                <p className="text-red-500 text-xs">As senhas não coincidem</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !passwordsMatch || !hasUpperCase || !hasLowerCase || !hasSpecialChar || !hasMinLength}
                            className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    A criar...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5" />
                                    Criar Utilizador
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function PasswordRule({ ok, text }: { ok: boolean; text: string }) {
    return (
        <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            {text}
        </div>
    );
}
