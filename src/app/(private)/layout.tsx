"use client"

import "./admin.css"
import { AccessProvider, AccessGate } from '@/contexts/AccessContext';

import { useContext, useEffect, useState } from "react"
import { GpayPaymentMonitor } from '@/components/layouts/admin/GpayPaymentMonitor';
import Sidebar from "@/components/layouts/admin/Sidebar"
import Header from "@/components/layouts/admin/Header"
import { SocketProvider } from "@/contexts/SocketContext"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { AuthContext } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AccessProvider><PrivateContent>{children}</PrivateContent></AccessProvider>;
}
function PrivateContent({children}:{children:React.ReactNode}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  useEffect(() => {
    try { setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true') } catch {}
  }, [])
  const toggleDesktopSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
  }
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isInitializing } = useContext(AuthContext)

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isInitializing, router])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!sidebarOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [sidebarOpen])

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_38%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.08),transparent_35%)]" />
        <div className="relative w-full max-w-sm rounded-3xl border bg-card/95 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-lg">
            SF
          </div>
          <h1 className="text-xl font-bold tracking-tight">A preparar o seu espaço</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estamos a carregar o utilizador, a organização e as permissões.
          </p>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isInitializing ? 'A validar a sessão…' : 'A redirecionar…'}
          </div>
        </div>
        <style jsx>{`@keyframes loading { 0% { transform: translateX(-110%); } 50% { transform: translateX(55%); } 100% { transform: translateX(210%); } }`}</style>
      </div>
    )
  }

  return (
    <SocketProvider>
      <GpayPaymentMonitor />
      <a href="#conteudo-principal" className="admin-skip-link">Saltar para o conteúdo</a>
      <div className="admin-shell flex h-dvh overflow-hidden bg-background">
        {/* Sidebar Desktop */}
        <div id="desktop-sidebar" className={sidebarCollapsed ? "hidden" : "hidden lg:flex shrink-0"}>
          <Sidebar />
        </div>

        {/* Sidebar Mobile Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu principal">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/50"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />

              {/* Sidebar */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative z-50 h-full"
              >
                <Sidebar closeSidebar={() => setSidebarOpen(false)} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* Main content */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <Header toggleSidebar={() => setSidebarOpen(true)} toggleDesktopSidebar={toggleDesktopSidebar} sidebarCollapsed={sidebarCollapsed} />
          <main id="conteudo-principal" tabIndex={-1} className="admin-content flex-1 overflow-y-auto p-4 md:p-6 xl:p-8 bg-background">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="h-full"
              >
                <AccessGate>{children}</AccessGate>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SocketProvider>
  )
}
