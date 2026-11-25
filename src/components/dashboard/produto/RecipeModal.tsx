'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Edit, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Loader2,
  Calculator,
  DollarSign
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "@/services/apiClients";
import { toast } from "react-toastify"; 
import { Product, RecipeItem } from "@/types/product";
import { parseCookies } from "nookies";

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  organizationId: string;
}

function recipeUnits(stockUnit: string, derived?: boolean) {
  if (derived) return ["un"];
  const normalized = stockUnit.trim().toLowerCase();
  if (["l", "ml"].includes(normalized)) return ["l", "ml"];
  if (["kg", "g"].includes(normalized)) return ["kg", "g"];
  return [normalized];
}
function stockQuantity(item: RecipeItem) {
  const factors: Record<string, number> = { l: 1000, ml: 1, kg: 1000, g: 1, un: 1 };
  const stockUnit = item.ingredient.isDerived ? "un" : item.ingredient.unit.toLowerCase();
  const recipeUnit = item.recipeUnit?.toLowerCase() || stockUnit;
  return Number(item.recipeQuantity ?? item.quantity) * (factors[recipeUnit] || 1) / (factors[stockUnit] || 1);
}

export function RecipeModal({ isOpen, onClose, product, organizationId }: RecipeModalProps) {
  const { '@servFixe.token': token } = parseCookies();
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [allIngredients, setAllIngredients] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const nextRowId = useRef(0);
  const [rows, setRows] = useState([{ id: 0, ingredientId: "", search: "", quantity: "", unit: "", impactaPreco: true, isOptional: false }]);
  const normalizeSearch = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const addRow = () => {
    const id = ++nextRowId.current;
    setRows(current => [...current, { id, ingredientId: "", search: "", quantity: "", unit: "", impactaPreco: true, isOptional: false }]);
  };

  const updateRow = (id: number, changes: Partial<(typeof rows)[number]>) => {
    setRows(current => current.map(row => row.id === id ? { ...row, ...changes } : row));
  };

  const fetchData = async (showLoading = true) => {
    if (!product?.id || !token) return;

    try {
      if (showLoading) setIsLoading(true);
      
      const ingredientsResponse = await api.get('/produts', {
        params: { organizationId, ingredientsOnly: true, includeUnavailable: true },
        headers: { Authorization: `Bearer ${token}` }
      });

      const ingredients = ingredientsResponse.data.filter(
        (p: Product) => p.id !== product.id && (p.isIgredient === true || p.allowAsIngredient === true)
      );

      const recipeResponse = await api.get(`/recipe/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const itemsWithPrices = recipeResponse.data.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        recipeQuantity: item.recipeQuantity ?? item.quantity,
        recipeUnit: (item.recipeUnit ?? (item.ingredient.isDerived ? "un" : item.ingredient.unit)).toLowerCase(),
        productId: item.productId,
        impactaPreco: item.impactaPreco,
        isSelectable: item.isSelectable ?? false,
        isOptional: item.isOptional ?? false,
        ingredient: {
          id: item.ingredient.id,
          name: item.ingredient.name,
          unit: item.ingredient.unit,
          isDerived: item.ingredient.isDerived,
          price: item.ingredient.PrecoVenda?.[0]?.preco_venda || 0,
          cost: Number(item.custoUnitario || 0),
          PrecoVenda: item.ingredient.PrecoVenda || []
        }
      }));

      setAllIngredients(ingredients);
      setRecipeItems(itemsWithPrices);
    } catch (error) {
      console.error("Error fetching recipe data:", error);
      toast.error("Erro ao carregar a ficha técnica");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      fetchData();
      resetForm();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, product, organizationId, token]);

  const resetForm = () => {
    setRows([{ id: 0, ingredientId: "", search: "", quantity: "", unit: "", impactaPreco: true, isOptional: false }]);
  };

  const calculateTotalCost = () => {
    return recipeItems.reduce((total, item) => {
      if (item.impactaPreco && !item.isSelectable) {
        const cost = item.ingredient.cost ?? item.ingredient.price ?? 0;
        return total + (cost * (stockQuantity(item) || 0));
      }
      return total;
    }, 0);
  };

  const handleAddIngredients = async () => {
    if (!product?.id || isSubmitting) return;

    const pending = rows.filter(row => row.ingredientId || row.quantity || row.search.trim());
    const ingredientIds = pending.map(row => row.ingredientId);
    if (!pending.length || pending.some(row =>
      !row.ingredientId || !Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0
    )) {
      toast.error("Selecione um ingrediente e indique uma quantidade válida em cada linha preenchida.");
      return;
    }
    if (new Set(ingredientIds).size !== pending.length ||
        recipeItems.some(item => ingredientIds.includes(item.ingredient.id))) {
      toast.error("Cada ingrediente pode aparecer apenas uma vez na ficha técnica.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/recipe", {
        productId: product.id,
        items: pending.map(({ ingredientId, quantity, unit, impactaPreco, isOptional }) => ({
          ingredientId, quantity: Number(quantity), unit: unit || undefined, impactaPreco, isOptional
        }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      resetForm();
      toast.success("Ingredientes guardados com sucesso!");
      await fetchData(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao guardar os ingredientes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateIngredient = async (item: RecipeItem) => {
    if (!String(item.recipeQuantity ?? item.quantity).trim() || !Number.isFinite(Number(item.recipeQuantity ?? item.quantity)) || Number(item.recipeQuantity ?? item.quantity) <= 0) {
      toast.error('Informe uma quantidade válida para o ingrediente.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const payload = {
        productId: product.id,
        ingredientId: item.ingredient.id,
        quantity: Number(item.recipeQuantity ?? item.quantity),
        unit: item.recipeUnit,
        impactaPreco: Boolean(item.impactaPreco),
        isSelectable: Boolean(item.isSelectable),
        isOptional: Boolean(item.isOptional)
      };

      //console.log("📤 Payload enviado:", payload);

      const response = await api.put(`/recipe`, payload, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        }
      });

      console.log("✅ Resposta do servidor:", response.data);
      toast.success("Ingrediente atualizado com sucesso!");
      //setIsEditing(false);
      fetchData();
    } catch (error: any) {
      console.error("❌ Erro completo:", error);
      console.error("📨 Resposta de erro:", error.response?.data);
      console.error("🔍 Status do erro:", error.response?.status);
      toast.error(error.response?.data?.error || "Erro ao atualizar ingrediente");
    } finally {
      setIsSubmitting(false);
    }
};

  const handleDeleteIngredient = async (id: string) => {
    try {
      setIsSubmitting(true);
      await api.delete(`/recipe/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRecipeItems(recipeItems.filter(item => item.id !== id));
      toast.success("Ingrediente removido com sucesso!");
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      toast.error("Erro ao remover ingrediente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleImpactaPreco = (id: string) => {
    setRecipeItems(recipeItems.map(item => 
      item.id === id ? {...item, impactaPreco: !item.impactaPreco} : item
    ));
  };


  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-background text-foreground rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Ficha técnica: {product.name} 
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os ingredientes e custos deste produto
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Card de Resumo do Custo */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Custo da ficha técnica
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {calculateTotalCost().toFixed(2)} Kz
                      </div>
                      <div className="text-sm text-muted-foreground">Custo Total</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {recipeItems.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Ingredientes</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {recipeItems.filter(item => item.impactaPreco).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Impactam Preço</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Ingredientes */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Ingredientes</CardTitle>
                    {!isEditing && recipeItems.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setShowAddIngredient(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {recipeItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">Nenhum ingrediente cadastrado.</p>
                      <Button onClick={() => setShowAddIngredient(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Primeiro Ingrediente
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingrediente</TableHead>
                            <TableHead>Opcional sem stock</TableHead>
                            <TableHead className="text-right">Preço Unitário</TableHead>
                            <TableHead className="text-right">Quantidade</TableHead>
                            <TableHead className="text-center">Impacta Preço</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            {isEditing && <TableHead className="text-right">Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recipeItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.ingredient.name}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Switch
                                    aria-label={`Tornar ${item.ingredient.name} opcional sem stock`}
                                    checked={item.isOptional ?? false}
                                    onCheckedChange={isOptional => setRecipeItems(current => current.map(row => row.id === item.id ? { ...row, isOptional } : row))}
                                    disabled={isSubmitting}
                                  />
                                ) : (item.isOptional ? "Sim" : "Não")}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {(item.ingredient.cost ?? item.ingredient.price ?? 0).toFixed(2)} Kz
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Input
                                      type="number"
                                      value={item.recipeQuantity ?? item.quantity}
                                      onChange={(e) => {
                                        const updatedItems = recipeItems.map(ri => 
                                          ri.id === item.id ? {...ri, recipeQuantity: e.target.value} : ri
                                        );
                                        setRecipeItems(updatedItems);
                                      }}
                                      className="w-20"
                                      min="0"
                                      step="any"
                                    />
                                    <Select value={item.recipeUnit} onValueChange={recipeUnit => {
                                      const oldUnit = item.recipeUnit || item.ingredient.unit;
                                      const factors: Record<string, number> = { l: 1000, ml: 1, kg: 1000, g: 1, un: 1 };
                                      const converted = Number(item.recipeQuantity ?? item.quantity) * (factors[oldUnit.toLowerCase()] || 1) / (factors[recipeUnit.toLowerCase()] || 1);
                                      setRecipeItems(current => current.map(row => row.id === item.id ? { ...row, recipeUnit, recipeQuantity: Number(converted.toPrecision(15)) } : row));
                                    }}>
                                      <SelectTrigger className="w-24" aria-label="Unidade de consumo"><SelectValue /></SelectTrigger>
                                      <SelectContent>{recipeUnits(item.ingredient.unit, item.ingredient.isDerived).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <span>
                                    {item.recipeQuantity ?? item.quantity} {item.recipeUnit ?? item.ingredient.unit}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <Switch
                                      checked={item.impactaPreco}
                                      onCheckedChange={() => toggleImpactaPreco(item.id)}
                                    />
                                    <Badge variant={item.impactaPreco ? "default" : "secondary"}>
                                      {item.impactaPreco ? "Sim" : "Não"}
                                    </Badge>
                                  </div>
                                ) : (
                                  <Badge variant={item.impactaPreco ? "default" : "secondary"}>
                                    {item.impactaPreco ? "Sim" : "Não"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-yellow-600 font-medium">
                                {item.isSelectable ? 'Definido no pedido' : `${((item.ingredient.cost ?? item.ingredient.price ?? 0) * (stockQuantity(item) || 0)).toFixed(2)} Kz`}
                              </TableCell>
                              {isEditing && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateIngredient(item)}
                                      disabled={isSubmitting}
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteIngredient(item.id)}
                                      disabled={isSubmitting}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Formulário de Adicionar Ingrediente */}
              {showAddIngredient && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Adicionar Ingrediente</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isSubmitting}
                        aria-label="Fechar formulário de ingredientes"
                        onClick={() => {
                          setShowAddIngredient(false);
                          resetForm();
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {rows.map(row => {
                        const ingredient = allIngredients.find(item => item.id === row.ingredientId);
                        const search = normalizeSearch(row.search);
                        const matches = allIngredients.filter(item =>
                          normalizeSearch(item.name).includes(search)
                        );

                        return (
                          <div key={row.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] md:items-start">
                            <div className="space-y-2">
                              <Label htmlFor={`ingredient-search-${row.id}`}>Pesquisar ingrediente</Label>
                              <Input
                                id={`ingredient-search-${row.id}`}
                                autoFocus
                                value={row.search}
                                placeholder="Digite o nome do ingrediente"
                                onChange={event => updateRow(row.id, { search: event.target.value, ingredientId: "" })}
                                disabled={isSubmitting}
                              />
                              <Select value={row.ingredientId} onValueChange={ingredientId => {
                                const selected = allIngredients.find(item => item.id === ingredientId);
                                updateRow(row.id, { ingredientId, unit: selected?.isDerived ? "un" : selected?.unit?.toLowerCase() || "" });
                              }} disabled={isSubmitting || matches.length === 0}>
                                <SelectTrigger className="w-full" aria-label="Ingrediente">
                                  <SelectValue placeholder="Selecione um ingrediente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {matches.map(item => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name} ({item.isDerived ? "unidade" : item.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {matches.length === 0 && (
                                <p className="text-xs text-muted-foreground" role="status">Nenhum ingrediente encontrado.</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`ingredient-quantity-${row.id}`}>Quantidade</Label>
                              <Input
                                id={`ingredient-quantity-${row.id}`}
                                type="number"
                                step="any"
                                value={row.quantity}
                                onChange={event => updateRow(row.id, { quantity: event.target.value })}
                                disabled={isSubmitting}
                                placeholder="0,00"
                              />
                              {ingredient && (
                                <Select value={row.unit || (ingredient.isDerived ? "un" : ingredient.unit)} onValueChange={unit => updateRow(row.id, { unit })} disabled={isSubmitting}>
                                  <SelectTrigger aria-label="Unidade de consumo"><SelectValue /></SelectTrigger>
                                  <SelectContent>{recipeUnits(ingredient.unit, ingredient.isDerived).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                                </Select>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`ingredient-price-${row.id}`}>Impacta no preço final?</Label>
                              <div>
                                <Switch
                                  id={`ingredient-price-${row.id}`}
                                  checked={row.impactaPreco}
                                  onCheckedChange={impactaPreco => updateRow(row.id, { impactaPreco })}
                                  disabled={isSubmitting}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`optional-${row.id}`}>Opcional sem stock</Label>
                              <Switch id={`optional-${row.id}`} checked={row.isOptional} onCheckedChange={isOptional => updateRow(row.id, { isOptional })} disabled={isSubmitting} />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Remover linha"
                              disabled={isSubmitting || rows.length === 1}
                              onClick={() => setRows(current => current.filter(item => item.id !== row.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap justify-between gap-3">
                      <Button variant="outline" onClick={addRow} disabled={isSubmitting}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar linha
                      </Button>
                      <Button onClick={handleAddIngredients} disabled={isSubmitting || !rows.some(row => row.ingredientId)}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar ingredientes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ações */}
              <div className="flex justify-end gap-3">
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar Edição
                  </Button>
                )}
                <Button onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
