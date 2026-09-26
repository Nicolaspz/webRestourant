'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from '@/services/api';
import { useAccess } from '@/contexts/AccessContext';
import { toast } from "react-toastify";

export interface User {
  id: string;
  name: string;
  email: string;
  telefone: string;
  role: string;
  user_name: string;
  created_at?: string;
  updated_at?: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialData?: User | null;
  organizationId: string;
}

export function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  mode,
  initialData,
  organizationId
}: UserFormModalProps) {
  const { access } = useAccess();
  const [roles,setRoles]=useState<string[]>([]);
  useEffect(()=>{if(isOpen)api.get('/access/roles').then(r=>setRoles(r.data.map((role:any)=>role.name))).catch(()=>toast.error('Não foi possível carregar os roles'));},[isOpen,organizationId]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telefone: '',
    user_name: '',
    role: '',
    password: '',
    confirmPassword: ''
  });

  // Preencher form quando initialData mudar
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email,
        telefone: initialData.telefone,
        user_name: initialData.user_name,
        role: initialData.role.toUpperCase(),
        password: '',
        confirmPassword: ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        telefone: '',
        user_name: '',
        role: '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if(!formData.role){toast.error('Selecione um role');return;}
    // Validação de senha para criação
    if (mode === 'create' && formData.password !== formData.confirmPassword) {
      toast.warning("As palavras-passe não coincidem.");
      return;
    }

    // Validação de senha para edição (se preenchida)
    if (mode === 'edit' && formData.password && formData.password !== formData.confirmPassword) {
      toast.warning("As palavras-passe não coincidem.");
      return;
    }

    // Preparar dados para envio
    const submitData = {
      name: formData.name,
      email: formData.email,
      telefone: formData.telefone,
      user_name: formData.user_name,
      role: formData.role,
      password: formData.password,
      organizationId: organizationId
    };

    onSubmit(submitData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Se não estiver aberto, não renderiza nada
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent showCloseButton={false} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <DialogTitle className="text-xl font-semibold">
              {mode === 'create' ? 'Registar Novo Colaborador' : 'Editar Perfil do Colaborador'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {mode === 'create'
                ? 'Preencha os dados abaixo para registar um novo membro na equipa.'
                : 'Atualize as informações de acesso e contacto do colaborador.'
              }
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Fechar formulário"
            onClick={onClose}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="overflow-y-auto p-6 space-y-6">
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={isSubmitting}>
          <legend className="mb-4 font-semibold">1. Dados do colaborador</legend>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Nome Completo *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Digite o nome completo"
              required
              className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Digite o email"
              required
              className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone" className="text-foreground">
              Telefone *
            </Label>
            <Input
              id="telefone"
              type="tel"
              autoComplete="tel"
              value={formData.telefone}
              onChange={(e) => handleInputChange('telefone', e.target.value)}
              placeholder="Digite o telefone"
              required
              className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_name" className="text-foreground">
              Nome de Usuário *
            </Label>
            <Input
              id="user_name"
              value={formData.user_name}
              onChange={(e) => handleInputChange('user_name', e.target.value)}
              placeholder="Digite o nome de usuário"
              required
              className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              disabled={isSubmitting}
            />
          </div>

        </fieldset>
        <fieldset className="space-y-3 rounded-xl border bg-muted/30 p-4" disabled={isSubmitting}>
          <legend className="px-1 font-semibold">2. Perfil de acesso</legend>
          <p className="text-sm text-muted-foreground">O perfil define as telas e funcionalidades disponíveis para este colaborador.</p>
          <div className="space-y-2">
            <Label htmlFor="role" className="text-foreground">
              Perfil *
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: string) => handleInputChange('role', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="role" className="bg-popover border-border text-popover-foreground">
                <SelectValue placeholder="Selecione um perfil" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {access?.role==='SUPER ADMIN'&&<SelectItem value="SUPER ADMIN">Super Admin (acesso total)</SelectItem>}
                {roles.map(role=><SelectItem key={role} value={role}>{role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={isSubmitting}>
          <legend className="mb-2 font-semibold">3. Segurança</legend>
          <p className="text-sm text-muted-foreground sm:col-span-2">{mode === 'edit' ? 'Deixe a palavra-passe vazia para manter a atual.' : 'Defina uma palavra-passe com pelo menos 8 caracteres.'}</p>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              {mode === 'create' ? 'Senha *' : 'Nova palavra-passe'}
            </Label>
            <Input
              id="password"
              autoComplete="new-password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder={mode === 'create' ? "Digite a senha" : "Deixe em branco para manter atual"}
              required={mode === 'create'}
              minLength={8}
              className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              disabled={isSubmitting}
            />
          </div>

          {(mode === 'create' || formData.password) && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                {mode === 'create' ? 'Confirmar Senha *' : 'Confirmar Nova Senha'}
              </Label>
              <Input
                id="confirmPassword"
                autoComplete="new-password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirme a senha"
                required={mode === 'create' || !!formData.password}
                minLength={8}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                disabled={isSubmitting}
              />
            </div>
          )}

        </fieldset>
        </div>
          {/* Footer */}
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className=""
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors min-w-24"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'A Processar Registo...' : 'A Guardar Mudanças...'}
                </>
              ) : (
                mode === 'create' ? 'Criar colaborador' : 'Guardar alterações'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
