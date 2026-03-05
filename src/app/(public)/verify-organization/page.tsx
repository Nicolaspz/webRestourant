"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Smartphone, ArrowRight } from "lucide-react";
import { api } from "@/services/apiClients";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import Image from "next/image";
import logoImg from '../../../../public/Logo.png';

function VerifyOrganizationContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const orgIdFromUrl = searchParams.get("orgId") || "";
    const phoneFromUrl = searchParams.get("phone") || "";

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        if (code.length !== 6) {
            toast.error("O código deve ter 6 dígitos");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post("/verify-code", {
                organizationId: orgIdFromUrl,
                code
            });

            if (response.data.success) {
                setStatus("success");
                setMessage(response.data.message);
                toast.success("Verificação concluída!");

                setTimeout(() => {
                    router.push(`/register/${orgIdFromUrl}`);
                }, 2500);
            }
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || "Código inválido ou expirado";
            toast.error(errorMsg);
            setStatus("error");
            setMessage(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <title>Verificar Código | Serve Fixe</title>

            <div className="w-full max-w-md text-center">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <Image src={logoImg} alt="Serve Fixe" width={44} height={44} className="rounded-lg" />
                    <span className="text-xl font-bold text-gray-900">Serve Fixe</span>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    {status === "success" ? (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                                <CheckCircle className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Conta Activada!</h2>
                            <p className="text-gray-600 mb-4">{message}</p>
                            <p className="text-sm text-gray-400">A redirecionar para a criação do administrador...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-2">
                                <Smartphone className="h-8 w-8 text-amber-600" />
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Verificar Telemóvel</h2>
                                <p className="text-sm text-gray-500">
                                    Introduza o código de 6 dígitos enviado para <br />
                                    <span className="font-semibold text-gray-700">{phoneFromUrl || "o seu número"}</span>
                                </p>
                            </div>

                            <div className="space-y-2 text-left">
                                <Label htmlFor="code" className="text-gray-700 font-medium ml-1">Código de Verificação</Label>
                                <Input
                                    id="code"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    className="h-14 text-center text-2xl tracking-[0.5em] font-bold border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-gray-900"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:from-amber-600 hover:to-orange-700 transition-all shadow-md disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        A verificar...
                                    </>
                                ) : (
                                    <>
                                        Verificar Código
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => router.push("/register")}
                                    className="text-sm text-gray-500 hover:text-amber-600 transition-colors"
                                >
                                    Não recebeu o código? Tente novamente
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VerifyOrganizationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        }>
            <VerifyOrganizationContent />
        </Suspense>
    );
}
