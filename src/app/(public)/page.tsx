'use client';

import { useState, useEffect } from 'react';
import {
  Utensils,
  Smartphone,
  TrendingUp,
  UserPlus,
  Check,
  ChefHat,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Star,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import logoImg from '../../../public/Logo.png';

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Smartphone,
      title: 'Pedidos Online',
      description: 'QR Code na mesa, pedidos directos do cliente. Interface intuitiva para garçons, cozinha e bar.',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      icon: TrendingUp,
      title: 'Gestão Completa',
      description: 'Controlo de stock, compras, receitas e fornecedores. Relatórios em tempo real para decisões estratégicas.',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      icon: ChefHat,
      title: 'Cozinha & Bar',
      description: 'Écrans dedicados para cozinha e bar. Notificações em tempo real quando há pedidos novos.',
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      icon: BarChart3,
      title: 'Facturação & Caixa',
      description: 'Gestão de mesas, sessões, facturas e pagamentos. Tudo integrado num único sistema.',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      icon: ShieldCheck,
      title: 'Multi-utilizador',
      description: 'Perfis para admin, caixa, garçom, cozinha e bar. Cada um vê apenas o que precisa.',
      gradient: 'from-rose-500 to-pink-600'
    },
    {
      icon: Zap,
      title: 'Tempo Real',
      description: 'WebSocket para actualizações instantâneas. Pedidos aparecem automaticamente nos écrans correctos.',
      gradient: 'from-yellow-500 to-amber-600'
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      description: 'Para snack-bars e pequenos restaurantes',
      price: 'Sob consulta',
      currency: 'AOA',
      period: '',
      features: ['Até 10 mesas', 'Gestão de pedidos', 'Relatórios básicos', '1 utilizador admin'],
      popular: false
    },
    {
      name: 'Profissional',
      description: 'Para restaurantes em crescimento',
      price: 'Sob consulta',
      currency: 'AOA',
      period: '',
      features: ['Até 30 mesas', 'Multi-utilizador', 'Cozinha & Bar em tempo real', 'Gestão de stock', 'Facturação completa'],
      popular: true
    },
    {
      name: 'Enterprise',
      description: 'Para redes de restaurantes',
      price: 'Sob consulta',
      currency: '',
      period: '',
      features: ['Mesas ilimitadas', 'Multi-organização', 'Suporte prioritário', 'Personalização total', 'API dedicada'],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <title>Serve Fixe - Sistema de Gestão para Restaurantes</title>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background barTender image */}
        <div className="absolute inset-0">
          <Image
            src="/barTender.jpg"
            alt="Bartender"
            fill
            className="object-cover"
            priority
            quality={85}
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-8">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="text-white/90 text-sm font-medium">Plataforma #1 de Gestão para Restaurantes em Angola</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Transforme o seu
              <span className="block bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Restaurante
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              Pedidos, stock, cozinha, bar, caixa e facturação — tudo num único sistema.
              Simples, rápido e feito para Angola.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5"
              >
                Comece Grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-white/30 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-white/20 transition-all duration-300"
              >
                Saber Mais
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">Funcionalidades</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tudo que o seu restaurante precisa
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Do pedido à factura, cada detalhe foi pensado para tornar a gestão do seu restaurante mais simples e eficiente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="py-20 md:py-28 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">Planos</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Escolha o plano ideal
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Comece com o plano gratuito e faça upgrade quando precisar. Sem surpresas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`
                  relative bg-white rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1
                  ${plan.popular
                    ? 'border-2 border-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]'
                    : 'border border-gray-200 hover:shadow-lg'
                  }
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      MAIS POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.currency && (
                      <span className="text-gray-500 text-sm font-medium">{plan.currency}{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`
                    block w-full text-center font-semibold py-3 px-6 rounded-xl transition-all duration-300
                    ${plan.popular
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }
                  `}
                >
                  {plan.name === 'Enterprise' ? 'Fale Connosco' : 'Começar Agora'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-600 to-red-600" />
        <div className="absolute inset-0 bg-[url('/barTender.jpg')] bg-cover bg-center opacity-10" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto para modernizar o seu restaurante?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Junte-se a dezenas de restaurantes em Angola que já usam o Serve Fixe.
            Teste grátis durante 14 dias.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-amber-700 font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:-translate-y-0.5"
          >
            Criar Conta Grátis
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src={logoImg}
                  alt="Serve Fixe"
                  width={50}
                  height={50}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold">Serve Fixe</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Sistema completo para gestão de restaurantes, bares e lanchonetes em Angola.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Links</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">Funcionalidades</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">Planos</a></li>
                <li><Link href="/login" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">Login</Link></li>
                <li><Link href="/register" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">Registar</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Suporte</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">Central de Ajuda</a></li>
                <li><a href="#" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">Documentação</a></li>
                <li><a href="#" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">Termos de Serviço</a></li>
                <li><a href="#" className="text-gray-400 hover:text-amber-400 transition-colors text-sm">Privacidade</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Contacto</h3>
              <address className="not-italic text-gray-400 text-sm space-y-2">
                <p>info@servefixe.com</p>
                <p>+244 949 714 096</p>
                <p>Luanda, Angola</p>
              </address>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Serve Fixe. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}