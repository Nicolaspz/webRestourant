
import {ActionButton} from '@/components/ui/action-feedback';
import { useAccess } from '@/contexts/AccessContext';
import Image from 'next/image';
import logoImg from '../../../../public/Logo.png'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { parseCookies } from "nookies"
import { useContext } from "react"
import { AuthContext } from "@/contexts/AuthContext"
import { getMediaUrl } from "../../../../config"

// Definir os tipos de roles
type UserRole = 'SUPER ADMIN' | 'ADMIN' | 'GARCON' | 'CAIXA' | 'COZINHA' | 'BAR' | 'ECONOMATO'

import {
  Users,
  Package,
  Carrot,
  Warehouse,
  Settings,
  Table2,
  Archive,
  ChevronDown,
  ChevronRight,
  Utensils,
  Home,
  ShoppingCart,
  ChefHat,
  GlassWater,
  Calculator,
  ClipboardList,
  DollarSign,
  TrendingUp,
  UserCog
} from "lucide-react"

// Estrutura hierárquica do menu
type MenuItem = {
  icon: any;
  label: string;
  href?: string;
  roles: UserRole[];
  subItems?: {
    label: string;
    href: string;
    icon?: any;
    roles: UserRole[];
  }[];
}

const menuStructure: MenuItem[] = [
  {icon:Home,label:'Visão geral',roles:[],subItems:[
    {label:'Painel principal',href:'/dashboard',icon:Home,roles:[]},
  ]},
  {icon:Utensils,label:'Atendimento',roles:[],subItems:[
    {label:'Gestão de Pedidos',href:'/dashboard/pedidos',icon:Package,roles:[]},
    {label:'Mapa de Mesas',href:'/dashboard/mesa',icon:Table2,roles:[]},
    {label:'Menu & Cardápio',href:'/dashboard/cardapio',icon:ClipboardList,roles:[]},
    {label:'Painel da Cozinha',href:'/dashboard/cozinha',icon:ChefHat,roles:[]},
    {label:'Painel do Bar',href:'/dashboard/bar',icon:GlassWater,roles:[]},
    {label:'Pedidos por área',href:'/dashboard/areas',icon:ClipboardList,roles:[]},
  ]},
  {icon:Package,label:'Produtos e stock',roles:[],subItems:[
    {label:'Produtos/Pratos',href:'/dashboard/products',icon:Package,roles:[]},
    {label:'Gestão de Categorias',href:'/dashboard/category',icon:ClipboardList,roles:[]},
    {label:'Ingredientes',href:'/dashboard/igredient',icon:Carrot,roles:[]},
    {label:'Stock',href:'/dashboard/stock',icon:Warehouse,roles:[]},
    {label:'Economato',href:'/dashboard/economato',icon:Archive,roles:[]},
    {label:'Áreas de consumo',href:'/dashboard/economato/areas',icon:Utensils,roles:[]},
    {label:'Transferências',href:'/dashboard/economato/pedidos',icon:Package,roles:[]},
    {label:'Quebras e consumos',href:'/dashboard/economato/consumo',icon:ClipboardList,roles:[]},
  ]},
  {icon:ShoppingCart,label:'Compras e fornecedores',roles:[],subItems:[
    {label:'Compras',href:'/dashboard/compra',icon:ShoppingCart,roles:[]},
    {label:'Fornecedores',href:'/dashboard/fornecedores',icon:Users,roles:[]},
  ]},
  {icon:Calculator,label:'Contabilidade',roles:[],subItems:[
    {label:'Gestão de Caixa',href:'/dashboard/caixa',icon:Calculator,roles:[]},
    {label:'Proformas',href:'/dashboard/proformas',icon:ClipboardList,roles:[]},
    {label:'Avisos de cobrança',href:'/dashboard/cobrancas',icon:DollarSign,roles:[]},
    {label:'Clientes',href:'/dashboard/clientes',icon:Users,roles:[]},
    {label:'Painel financeiro',href:'/dashboard/advanced',icon:TrendingUp,roles:[]},
  ]},
  {icon:UserCog,label:'Administração',roles:[],subItems:[
    {label:'Gestão do Usuário',href:'/dashboard/users',icon:Users,roles:[]},
    {label:'Roles e permissões',href:'/dashboard/roles',icon:UserCog,roles:[]},
    {label:'Definições',href:'/dashboard/settings',icon:Settings,roles:[]},
  ]},
]

export default function Sidebar({ closeSidebar }: { closeSidebar?: () => void }) {
  const { access, canScreen } = useAccess();
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [filteredMenu, setFilteredMenu] = useState<MenuItem[]>([])
  const { user } = useContext(AuthContext)

  useEffect(() => {
    // Pegar a role do cookie
    const role = access?.role
    if (role) {
      setUserRole(role as UserRole)

      // Filtrar menu baseado na role
      const filtered = menuStructure.map(item => item.subItems ? {...item,subItems:item.subItems.filter(sub=>canScreen(sub.href))} : item)
        .filter(item => item.href ? canScreen(item.href) : !!item.subItems?.length);
      setFilteredMenu(filtered)

      // Abrir menus que contenham o path atual
      const initialOpenState: Record<string, boolean> = {}
      filtered.forEach(item => {
        if (item.subItems && item.subItems.length > 0) {
          const hasActiveChild = item.subItems.some(subItem =>
            pathname === subItem.href || pathname?.startsWith(subItem.href + '/')
          )
          initialOpenState[item.label] = true
        }
      })
      setOpenMenus(previous => ({...initialOpenState,...previous}))
    }
  }, [pathname, access])

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }))
  }


  return (
    <aside aria-label="Menu principal" className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-logo">
          {user?.imageLogo ? <img src={getMediaUrl(user.imageLogo)} alt="" className="h-full w-full object-cover" /> :
            <Image src={logoImg} alt="" width={40} height={40} priority className="object-contain" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={user?.name_org}>{user?.name_org || 'ServeFixe'}</p>
          <p className="mt-1 text-xs text-slate-400">Gestão do restaurante</p>
        </div>
        {closeSidebar && <ActionButton type="button" onClick={closeSidebar} aria-label="Fechar menu principal" className="h-11 w-11 rounded-lg hover:bg-white/10 text-xl">×</ActionButton>}
      </div>
      <nav className="admin-navigation" aria-label="Secções do painel">
        {!userRole && <p role="status" className="p-4 text-sm text-slate-400">A carregar o menu…</p>}
        {filteredMenu.map(item => {
          const children = item.subItems;
          if (item.href) return <Link key={item.href} href={item.href} onClick={closeSidebar}
            className="admin-nav-link" aria-current={pathname === item.href ? 'page' : undefined}>
            <item.icon size={18} aria-hidden="true" /><span>{item.label}</span>
          </Link>;
          if (!children?.length) return null;
          const open = !!openMenus[item.label];
          const id = 'menu-' + item.label.replace(/\s+/g, '-').toLowerCase();
          return <div key={item.label} className="admin-nav-section">
            <ActionButton type="button" className="admin-nav-heading" onClick={() => toggleMenu(item.label)} aria-expanded={open} aria-controls={id}>
              {item.label}<ChevronDown size={14} className={cn("transition-transform", !open && "-rotate-90")} />
            </ActionButton>
            <div id={id} hidden={!open} className="space-y-1">
              {children.map(child => {
                const Icon = child.icon || item.icon;
                const active = pathname === child.href || (child.href !== '/dashboard' && pathname.startsWith(child.href + '/') && !filteredMenu.some(section => section.subItems?.some(other => other.href.length > child.href.length && (pathname === other.href || pathname.startsWith(other.href + '/')))));
                return <Link key={child.href} href={child.href} onClick={closeSidebar} className="admin-nav-link" aria-current={active ? 'page' : undefined}>
                  <Icon size={18} aria-hidden="true" /><span>{child.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-300" />}
                </Link>;
              })}
            </div>
          </div>;
        })}
      </nav>
      <div className="admin-sidebar-footer">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><UserCog size={17} /></span>
        <div className="min-w-0"><p className="truncate text-sm font-medium">{user?.name || 'Utilizador'}</p><p className="text-xs text-slate-400 mt-0.5">{userRole}</p></div>
      </div>
    </aside>
  )
}
