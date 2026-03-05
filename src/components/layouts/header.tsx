'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Image from 'next/image';
import { useState, useEffect } from 'react';
import logoImg from '../../../public/Logo.png';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200'
          : 'bg-transparent'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoImg}
              alt="Serve Fixe"
              width={44}
              height={44}
              priority
              className="rounded-lg"
            />
            <span className={`font-bold text-lg transition-colors duration-300 ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              Serve Fixe
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className={`text-sm font-medium transition-colors duration-300 hover:text-amber-500 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}
            >
              Funcionalidades
            </a>
            <a
              href="#pricing"
              className={`text-sm font-medium transition-colors duration-300 hover:text-amber-500 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}
            >
              Planos
            </a>
            <Link
              href="/login"
              className={`text-sm font-medium transition-colors duration-300 hover:text-amber-500 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold px-5 py-2 rounded-lg text-sm hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-md shadow-amber-500/20"
            >
              Começar Grátis
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className={`h-6 w-6 ${scrolled ? 'text-gray-900' : 'text-white'}`} />
            ) : (
              <Menu className={`h-6 w-6 ${scrolled ? 'text-gray-900' : 'text-white'}`} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white rounded-xl shadow-xl mt-2 p-4 border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-3">
              <a
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Funcionalidades
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileOpen(false)}
                className="text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Planos
              </a>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg text-center hover:from-amber-600 hover:to-orange-700 transition-all"
              >
                Começar Grátis
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}