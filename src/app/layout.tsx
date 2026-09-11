import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from "@/components/theme-provider";
import { ToastContainer } from "react-toastify";

export const metadata: Metadata = {
  title: {
    template: "%s | Serve Fixe",
    default: "Serve Fixe - Gestão de Restaurantes",
  },
  description: "Sistema completo para gestão de restaurantes, bares e lanchonetes em Angola.",
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-AO" suppressHydrationWarning>

      <body
        className="antialiased"
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"

        >
          <AuthProvider>{children}</AuthProvider>
          <ToastContainer position="top-right" autoClose={4000} newestOnTop limit={3} closeOnClick pauseOnFocusLoss />
        </ThemeProvider>
      </body>
    </html>
  )
}

