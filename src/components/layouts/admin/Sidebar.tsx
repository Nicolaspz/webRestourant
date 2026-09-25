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
  {
    icon: Home,
    label: "Visão geral",
    href: "/dashboard",
    roles: ['SUPER ADMIN', 'ADMIN', 'GARCON', 'CAIXA', 'COZINHA', 'BAR', 'ECONOMATO']
  },

  // Gestão do Restaurante
  {
    icon: Utensils,
    label: "Atendimento",
    roles: ['SUPER ADMIN', 'ADMIN', 'GARCON', 'CAIXA', 'COZINHA', 'BAR', 'ECONOMATO'],
    subItems: [
      {
        label: "Gestão de Pedidos",
        href: "/dashboard/pedidos",
        icon: Package,
        roles: ['SUPER ADMIN', 'ADMIN']
      },
      {
        label: "Mapa de Mesas",
        href: "/dashboard/mesa",
        icon: Table2,
        roles: ['SUPER ADMIN', 'ADMIN', 'GARCON', 'CAIXA']
      },
      {
        label: "Menu & Cardápio",
        href: "/dashboard/cardapio",
        icon: ClipboardList,
        roles: ['SUPER ADMIN', 'ADMIN', 'GARCON']
      },
      {
        label: "Gestão de Categorias",
        href: "/dashboard/category",
        icon: ClipboardList,
        roles: ['SUPER ADMIN', 'ADMIN']
      },
      {
        label: "Painel da Cozinha",
        href: "/dashboard/cozinha",
        icon: ChefHat,
        roles: ['SUPER ADMIN', 'ADMIN', 'COZINHA']
      },
      {
        label: "Painel do Bar",
        href: "/dashboard/bar",
        icon: GlassWater,
        roles: ['SUPER ADMIN', 'ADMIN', 'BAR']
      },
      {
        label: "Takeaway (Balcão)",
        href: "/dashboard/takeaway",
        icon: Package,
        roles: ['SUPER ADMIN', 'ADMIN', 'CAIXA']
      }
    ]
  },

  // Gestão de Produtos
  {
    icon: Package,
    label: "Produtos e stock",
    roles: ['SUPER ADMIN', 'ADMIN', 'ECONOMATO', 'COZINHA', 'BAR', 'GARCON', 'CAIXA'],
    subItems: [

      {
        label: "Produtos/Pratos",
        href: "/dashboard/products",
        icon: Package,
        roles: ['SUPER ADMIN', 'ADMIN']
      },
      {
        label: "Ingredientes",
        href: "/dashboard/igredient",
        icon: Carrot,
        roles: ['SUPER ADMIN', 'ADMIN']
      },
      {
        label: "Stock",
        href: "/dashboard/stock",
        icon: Warehouse,
        roles: ['SUPER ADMIN', 'ADMIN', 'ECONOMATO']
      },
      {
        label: "Economato",
        href: "/dashboard/economato",
        icon: Archive,
        roles: ['SUPER ADMIN', 'ADMIN', 'ECONOMATO', 'COZINHA', 'BAR', 'GARCON', 'CAIXA']
      }
    ]
  },

  // Gestão Financeira
  {
    icon: DollarSign,
    label: "Financeiro",
    roles: ['SUPER ADMIN', 'ADMIN', 'CAIXA'],
    subItems: [
      {
        label: "Gestão de Caixa",
        href: "/dashboard/caixa",
        icon: Calculator,
        roles: ['SUPER ADMIN', 'ADMIN', 'CAIXA']
      },
      {
        label: "Compras",
        href: "/dashboard/compra",
        icon: ShoppingCart,
        roles: ['SUPER ADMIN', 'ADMIN']
      },
      {
        label: "Fornecedores",
        href: "/dashboard/fornecedores",
        icon: Users,
        roles: ['SUPER ADMIN', 'ADMIN']
      },
      {
        label: "Dash Avançado",
        href: "/dashboard/advanced",
        icon: TrendingUp,
        roles: ['SUPER ADMIN']
      }
    ]
  },

  // Administração
  {
    icon: UserCog,
    label: "Gestão",
    roles: ['SUPER ADMIN', 'ADMIN'],
    subItems: [
      {
        label: "Gestão do Usuário",
        href: "/dashboard/users",
        icon: Users,
        roles: ['SUPER ADMIN', 'ADMIN']
      },
      {
        label: "Definições",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ['SUPER ADMIN']
      }
    ]
  }
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
      if(canScreen('/dashboard/roles')) filtered.push({label:'Roles e permissões',href:'/dashboard/roles',icon:UserCog,roles:[]});
      if(canScreen('/dashboard/areas')) filtered.push({label:'Pedidos por área',href:'/dashboard/areas',icon:UserCog,roles:[]});
      for (const [href,label] of [['/dashboard/economato/areas','Áreas de consumo'],['/dashboard/economato/pedidos','Transferências'],['/dashboard/economato/consumo','Quebras e consumos']]) {
        if(canScreen(href)) filtered.push({label,href,icon:UserCog,roles:[]});
      }
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
      setOpenMenus(initialOpenState)
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
        {closeSidebar && <button type="button" onClick={closeSidebar} aria-label="Fechar menu principal" className="h-11 w-11 rounded-lg hover:bg-white/10 text-xl">×</button>}
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
            <button type="button" className="admin-nav-heading" onClick={() => toggleMenu(item.label)} aria-expanded={open} aria-controls={id}>
              {item.label}<ChevronDown size={14} className={cn("transition-transform", !open && "-rotate-90")} />
            </button>
            <div id={id} hidden={!open} className="space-y-1">
              {children.map(child => {
                const Icon = child.icon || item.icon;
                const active = pathname === child.href || pathname.startsWith(child.href + '/');
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
