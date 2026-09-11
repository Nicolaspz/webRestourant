"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, LogOut, Menu } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-swicther"
import { useContext } from "react"
import { AuthContext } from "@/contexts/AuthContext"
import { CaixaControl } from "@/components/dashboard/caixa/CaixaControl"
import { usePathname } from "next/navigation"

const pageLabels: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Painel principal', subtitle: 'Visão geral do restaurante' },
  '/dashboard/mesa': { title: 'Mapa de mesas', subtitle: 'Atendimento e consumo em tempo real' },
  '/dashboard/pedidos': { title: 'Gestão de pedidos', subtitle: 'Acompanhe e organize os pedidos' },
  '/dashboard/cozinha': { title: 'Painel da cozinha', subtitle: 'Pedidos em preparação' },
  '/dashboard/bar': { title: 'Painel do bar', subtitle: 'Bebidas e pedidos em preparação' },
  '/dashboard/caixa': { title: 'Caixa', subtitle: 'Pagamentos, documentos e fecho do turno' },
  '/dashboard/takeaway': { title: 'Takeaway', subtitle: 'Pedidos de balcão e entrega' },
  '/dashboard/products': { title: 'Produtos e pratos', subtitle: 'Catálogo, preços e receitas' },
  '/dashboard/stock': { title: 'Stock', subtitle: 'Disponibilidade e movimentos' },
  '/dashboard/economato': { title: 'Economato', subtitle: 'Stock e transferências por área' },
  '/dashboard/users': { title: 'Utilizadores', subtitle: 'Equipa, perfis e permissões' },
  '/dashboard/settings': { title: 'Definições', subtitle: 'Organização, conta e segurança' },
}

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { signOut, user } = useContext(AuthContext);
  const pathname = usePathname();
  const currentPage = Object.entries(pageLabels)
    .sort(([a], [b]) => b.length - a.length)
    .find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1]
    ?? pageLabels['/dashboard'];
  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'UT';
  const handleLogout = () => {
    signOut()
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-b border-[var(--sidebar-border)]">
      {/* Esquerda: Menu e Título */}
      <div className="flex items-center gap-4 min-w-[150px]">
        <button onClick={toggleSidebar} className="lg:hidden rounded-md p-2 hover:bg-[var(--sidebar-accent)]" aria-label="Abrir menu principal">
          <Menu className="w-6 h-6 text-[var(--sidebar-foreground)] cursor-pointer" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{currentPage.title}</h1>
          <p className="hidden text-sm text-[var(--muted-foreground)] sm:block">{currentPage.subtitle}</p>
        </div>
      </div>
      {/* <span>{user?.tenant_id}</span> */}

      {/* Direita: Ícones e Menu do Usuário */}
      <div className="flex items-center gap-4 min-w-[150px] justify-end">
        <CaixaControl />
        <ThemeSwitcher />
        {/* Avatar com Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="min-h-11 px-2 flex items-center gap-2" aria-label="Abrir menu do utilizador">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  alt={user?.name ? `Fotografia de ${user.name}` : 'Utilizador'}
                  className="rounded-full object-cover"
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)]">
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Terminar sessão{user?.name ? ` — ${user.name}` : ''}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
