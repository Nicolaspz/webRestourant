"use client";

import { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { parseCookies } from "nookies";
import { api } from "@/services/apiClients";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import {
    UploadCloud,
    FileSpreadsheet,
    Image as ImageIcon,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ListPlus,
    Download
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from "@/types/product";

interface Area {
    id: string;
    nome: string;
}

export default function ImportProductsPage() {
    const { user } = useContext(AuthContext);
    const { "@servFixe.token": token } = parseCookies();
    const router = useRouter();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [status, setStatus] = useState("");
    const [createdList, setCreatedList] = useState<string[]>([]);
    const [errorsList, setErrorsList] = useState<string[]>([]);

    // Refs ou states para os arquivos
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<FileList | null>(null);

    // Campos Padrão Form
    const [categories, setCategories] = useState<Category[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);

    const [defaultCategory, setDefaultCategory] = useState<string>("");
    const [defaultArea, setDefaultArea] = useState<string>("");
    const [defaultUnit, setDefaultUnit] = useState<string>("UN");

    useEffect(() => {
        async function loadOptions() {
            if (!user?.organizationId || !token) return;
            try {
                const [catRes, areaRes] = await Promise.all([
                    api.get('/category', {
                        params: { organizationId: user.organizationId },
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    api.get('/areas', {
                        params: { organizationId: user.organizationId },
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setCategories(catRes.data);

                // Tratar retorno de área (backend retorna data.data)
                if (areaRes.data && Array.isArray(areaRes.data.data)) {
                    setAreas(areaRes.data.data);
                } else if (Array.isArray(areaRes.data)) {
                    setAreas(areaRes.data);
                } else {
                    setAreas([]);
                }
            } catch (error) {
                console.error("Erro ao carregar opções", error);
            }
        }
        loadOptions();
    }, [user?.organizationId, token]);

    const handleDownloadTemplate = async () => {
        if (!token) return;
        try {
            setIsDownloading(true);
            const response = await api.get('/import-products/template', {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'molde_importacao_produtos.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error("Erro ao transferir modelo.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user?.organizationId || !token) {
            toast.error("Você precisa estar logado.");
            return;
        }

        if (!excelFile) {
            toast.error("Por favor, selecione o arquivo Excel.");
            return;
        }
        if (!imageFiles || imageFiles.length === 0) {
            toast.error("Por favor, selecione as imagens.");
            return;
        }

        setIsSubmitting(true);
        setStatus("Enviando dados para o servidor...");
        setCreatedList([]);
        setErrorsList([]);

        try {
            const formData = new FormData();
            formData.append("excel", excelFile);

            // Adiciono valores default se quiser reaproveitar
            if (defaultCategory) formData.append("defaultCategory", defaultCategory);
            if (defaultArea) formData.append("defaultArea", defaultArea);
            if (defaultUnit) formData.append("defaultUnit", defaultUnit);

            Array.from(imageFiles).forEach((img) => {
                formData.append("images", img);
            });

            const response = await api.post("/import-products", formData, {
                params: { organizationId: user.organizationId },
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            if (response.data.errors && response.data.errors.length > 0) {
                setErrorsList(response.data.errors);
            }

            if (response.data.created && response.data.created.length > 0) {
                setCreatedList(response.data.created);
                toast.success(`Importados com sucesso: ${response.data.created.length} produto(s)!`);
            }

            setStatus("Importação concluída.");

            if (response.data.errors?.length === 0) {
                router.push("/dashboard/products");
            }

        } catch (error: any) {
            console.error(error);
            toast.error("Falha ao importar produtos. Tente novamente.");
            setStatus("Erro durante a importação.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-6 min-h-screen">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Importar Produtos</h1>
                    <p className="text-muted-foreground">
                        Cadastre vários produtos de uma vez via planilha Excel
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleDownloadTemplate} disabled={isDownloading}>
                        {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Baixar Excel Molde
                    </Button>
                    <Button variant={"outline"} asChild>
                        <Link href="/dashboard/products">
                            Voltar
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-lg border-t-4 border-t-indigo-600">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UploadCloud className="w-5 h-5 text-indigo-600" />
                            Upload de Arquivos
                        </CardTitle>
                        <CardDescription>Selecione a planilha com os dados e as imagens em lote.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Configurações Padrão */}
                            <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                                <h3 className="text-sm font-semibold text-slate-700">Configurações Padrão (Opcional)</h3>
                                <p className="text-xs text-slate-500">
                                    Se a coluna não existir no Excel, estes valores serão usados.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Categoria Padrão</label>
                                        <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map(c => (
                                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Área Padrão</label>
                                        <Select value={defaultArea} onValueChange={setDefaultArea}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {areas.map(a => (
                                                    <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Unidade Padrão</label>
                                        <Select value={defaultUnit} onValueChange={setDefaultUnit}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Ex: UN, KG" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UN">UN (Unidade)</SelectItem>
                                                <SelectItem value="KG">KG (Quilograma)</SelectItem>
                                                <SelectItem value="L">L (Litro)</SelectItem>
                                                <SelectItem value="G">G (Grama)</SelectItem>
                                                <SelectItem value="ML">ML (Mililitro)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border-2 border-dashed bg-slate-50 transition-colors hover:bg-slate-100 flex flex-col gap-2">
                                <label className="flex gap-2 items-center font-semibold text-slate-800 cursor-pointer">
                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                    Planilha de Produtos (.xlsx)
                                </label>
                                <Input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                                    className="cursor-pointer file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md hover:file:bg-indigo-100"
                                />
                                <p className="text-xs text-slate-500">As colunas padrão são: nome, descricao, preco, categoria, area_padrao, imagem, unidade.</p>
                            </div>

                            <div className="p-4 rounded-xl border-2 border-dashed bg-slate-50 transition-colors hover:bg-slate-100 flex flex-col gap-2">
                                <label className="flex gap-2 items-center font-semibold text-slate-800 cursor-pointer">
                                    <ImageIcon className="w-5 h-5 text-rose-500" />
                                    Imagens (Envio Múltiplo)
                                </label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => setImageFiles(e.target.files)}
                                    className="cursor-pointer file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md hover:file:bg-indigo-100"
                                />
                                <p className="text-xs text-slate-500">Selecione até 20 imagens. O sistema buscará o nome correto automaticamente.</p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting || !excelFile || !imageFiles}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-medium shadow-md transition-all active:scale-[0.98]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Processando Importação...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="mr-2 h-5 w-5" />
                                        Iniciar Importação
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resultados</CardTitle>
                        <CardDescription>{status || "Aguardando submissão..."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {createdList.length > 0 && (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-2 text-green-800 font-semibold">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    <h3>Sucesso ({createdList.length})</h3>
                                </div>
                                <ul className="list-disc pl-5 text-sm text-green-700 space-y-1 max-h-40 overflow-y-auto">
                                    {createdList.map(item => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {errorsList.length > 0 && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-2 text-red-800 font-semibold">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <h3>Erros / Alertas ({errorsList.length})</h3>
                                </div>
                                <ul className="list-disc pl-5 text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                                    {errorsList.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {!createdList.length && !errorsList.length && (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-dashed rounded-xl grayscale opacity-60">
                                <ListPlus className="w-12 h-12 text-slate-400 mb-3" />
                                <p className="text-slate-500 font-medium">Os resultados aparecerão aqui</p>
                            </div>
                        )}

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
