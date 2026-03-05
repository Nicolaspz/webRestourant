// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type UserRole = 'SUPER ADMIN' | 'ADMIN' | 'GARCON' | 'CAIXA' | 'COZINHA' | 'BAR'

// Permissões específicas (ordem importa: mais específicas primeiro)
const routePermissions: Record<string, UserRole[]> = {
  '/dashboard/caixa': ['SUPER ADMIN', 'ADMIN', 'CAIXA'],
  '/dashboard/bar': ['SUPER ADMIN', 'ADMIN', 'BAR'],
  '/dashboard/cozinha': ['SUPER ADMIN', 'ADMIN', 'COZINHA'],
  '/dashboard/stock': ['SUPER ADMIN', 'ADMIN'],
  '/dashboard/compra': ['SUPER ADMIN', 'ADMIN'],
  '/dashboard/igredient': ['SUPER ADMIN', 'ADMIN'],
  '/dashboard/products': ['SUPER ADMIN', 'ADMIN'],
  '/dashboard/settings': ['SUPER ADMIN'], // Apenas Super Admin apaga Org/mexe licença
  '/dashboard/mesa': ['SUPER ADMIN', 'ADMIN', 'GARCON','CAIXA'],
  '/dashboard/users': ['SUPER ADMIN', 'ADMIN'],
  '/dashboard/economato': ['SUPER ADMIN', 'ADMIN'],
  '/dashboard/advanced': ['SUPER ADMIN'], // Dash avançado financeiro apenas Super Admin

  // Geral por último
  '/dashboard': ['SUPER ADMIN', 'ADMIN', 'GARCON', 'CAIXA', 'COZINHA', 'BAR'],
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const token = request.cookies.get('@servFixe.token')?.value
  const userRole = request.cookies.get('@servFixe.role')?.value?.toUpperCase() as UserRole | undefined

  // 🔐 Só protege rotas do dashboard
  const isDashboardRoute = pathname.startsWith('/dashboard')

  // 🔑 Rotas de autenticação
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/activate')

  console.log('🔎 Middleware:', {
    pathname,
    isDashboardRoute,
    hasToken: !!token,
    userRole,
  })

  // 🚫 Se tentar acessar dashboard sem login
  if (isDashboardRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 🔄 Se já estiver logado e tentar ir para login
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 🎯 Verificação de permissão por role
  if (isDashboardRoute && token && userRole) {
    let matchedRoute: string | undefined

    for (const route of Object.keys(routePermissions)) {
      if (pathname.startsWith(route)) {
        matchedRoute = route
        break
      }
    }

    if (matchedRoute) {
      const allowedRoles = routePermissions[matchedRoute]

      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  // 🔓 Tudo que não for dashboard é público
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
