"use client"

import { useState } from "react"
import Sidebar from "@/components/layouts/admin/Sidebar"
import Header from "@/components/layouts/admin/Header"
import { SocketProvider } from "@/contexts/SocketContext"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <SocketProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--sidebar)]">
        {/* Sidebar Desktop */}
        <div className="hidden lg:flex">
          <Sidebar />
        </div>

        {/* Sidebar Mobile Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/50"
                onClick={() => setSidebarOpen(false)}
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
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header toggleSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--background)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SocketProvider>
  )
}
