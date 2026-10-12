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
import { CenterScreenLoader } from '@/components/ui/center-screen-loader';

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
  const { isAuthenticated, isInitializing, user } = useContext(AuthContext)

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
    return <CenterScreenLoader />
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
          <main id="conteudo-principal" tabIndex={-1} className={`admin-content flex-1 overflow-y-auto bg-background ${user?.role?.toUpperCase() === 'CAIXA' ? 'p-0' : 'p-4 md:p-6 xl:p-8'}`}>
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
