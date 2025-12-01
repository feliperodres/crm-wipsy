import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import nuevoLogo from '@/assets/nuevo-logo.png';
import dashboardScreenshot from '@/assets/dashboard-screenshot.png';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { WhatsAppChatSimulation } from '@/components/demo/WhatsAppChatSimulation';
import {
  Bot,
  MessageCircle,
  ShoppingCart,
  Store,
  BarChart3,
  Users,
  Package,
  Plug,
  ArrowRight,
  Check,
  Play,
  Rocket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackViewContent, trackInitiateCheckout, trackCustomEvent } from '@/utils/metaPixel';
import * as TikTokPixel from '@/utils/tiktokPixel';
import { motion, useScroll, useTransform } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

import { IntegrationLogos } from '@/components/landing/IntegrationLogos';

const Landing = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  // Default to light mode as requested
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Track page view on mount and fetch theme
  useEffect(() => {
    trackViewContent('landing');
    TikTokPixel.trackViewContent('landing', {
      contentName: 'Landing Page - Main',
      value: 0,
      currency: 'USD'
    });

    const fetchTheme = async () => {
      try {
        const { data } = await (supabase as any)
          .from('app_settings')
          .select('value')
          .eq('key', 'landing_theme')
          .maybeSingle();

        if (data?.value) {
          setTheme(data.value as 'dark' | 'light');
        }
      } catch (error) {
        console.warn('Could not fetch landing theme, defaulting to light');
      }
    };
    fetchTheme();
  }, []);

  const isDark = theme === 'dark';

  // Theme classes helper
  const t = {
    bg: isDark ? 'bg-[#000000]' : 'bg-slate-50',
    text: isDark ? 'text-white' : 'text-slate-900',
    textMuted: isDark ? 'text-gray-400' : 'text-slate-600',
    border: isDark ? 'border-white/5' : 'border-slate-200',
    navBg: isDark ? 'bg-black/50 border-white/5' : 'bg-white/80 border-slate-200',
    cardBg: isDark ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]' : 'bg-white border-slate-200 hover:bg-slate-100 shadow-sm',
    pricingCard: isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm',
    glowText: isDark ? 'bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500' : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700',
    footer: isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200',
    featureIconBg: (base: string) => isDark ? `${base}/10` : `${base}/10`, // Keep same for consistency or adjust
    buttonPrimary: isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800',
    buttonOutline: isDark ? 'border-white/20 bg-transparent hover:bg-white/10 text-white' : 'border-slate-300 bg-transparent hover:bg-slate-100 text-slate-900',
    textMuted2: isDark ? 'text-gray-500' : 'text-slate-500',
  };

  const handlePlanSelection = (planId: string) => {
    setLoadingPlan(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const planValue = parseInt(plan.price.replace('$', '')) || 0;
      trackInitiateCheckout(planId, plan.name, planValue);
      TikTokPixel.trackInitiateCheckout(planId, plan.name, planValue);
      TikTokPixel.trackViewContent('subscription_plan', {
        contentId: planId,
        contentName: plan.name,
        value: planValue,
        currency: 'USD'
      });
    }
    localStorage.setItem('selectedPlan', planId);
    navigate('/auth');
    setLoadingPlan(null);
  };

  const handleStartFree = () => {
    trackCustomEvent('ClickStartFreeTrial', {
      content_name: 'Landing CTA',
      button_text: 'Comenzar Prueba Gratuita'
    });
    TikTokPixel.trackCustomEvent('ClickButton', {
      contents: [{
        content_id: 'free_trial',
        content_type: 'subscription_plan',
        content_name: 'Free Trial'
      }],
      content_name: 'Start Free Trial Button',
      value: 0,
      currency: 'USD'
    });
    navigate('/auth');
  };

  const handleViewDemo = () => {
    trackCustomEvent('ClickViewDemo', {
      content_name: 'Landing CTA',
      button_text: 'Ver Demo',
      action: 'open_whatsapp'
    });
    TikTokPixel.trackCustomEvent('ClickButton', {
      contents: [{
        content_id: 'demo_request',
        content_type: 'service',
        content_name: 'Demo Request'
      }],
      content_name: 'View Demo Button',
      value: 0,
      currency: 'USD'
    });
    window.open('https://wa.me/525526686750', '_blank');
  };

  const features = [
    {
      icon: Bot,
      title: "AI Agent Inteligente",
      description: "Tu empleado estrella que nunca duerme. Responde al instante, cierra ventas y fideliza clientes 24/7.",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Powerhouse",
      description: "Transforma WhatsApp en una máquina de ventas. Automatización, plantillas y gestión masiva sin esfuerzo.",
      color: "text-blue-300",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20"
    },
    {
      icon: ShoppingCart,
      title: "Pedidos Automáticos",
      description: "Desde 'hola' hasta 'pago confirmado' sin intervención humana. El sistema gestiona todo el flujo.",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20"
    },
    {
      icon: Store,
      title: "E-commerce Integrado",
      description: "Tu catálogo web sincronizado perfectamente con WhatsApp. Una experiencia de compra fluida y moderna.",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20"
    }
  ];

  const plans = [
    {
      id: 'free',
      name: 'Gratis',
      price: '$0',
      period: '/mes',
      description: 'Para explorar el futuro',
      features: [
        '20 productos en catálogo',
        '100 mensajes IA / mes',
        'Panel de control básico',
        'Soporte por comunidad'
      ],
      popular: false
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      period: '/mes',
      description: 'Impulsa tu emprendimiento',
      features: [
        'Personalización de IA',
        '100 productos',
        '1,500 mensajes IA',
        'Analytics básicos',
        'Soporte por email'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$49',
      period: '/mes',
      description: 'Escala sin límites',
      features: [
        'IA Avanzada Personalizable',
        '200 productos',
        '3,500 mensajes IA',
        'Integración Shopify',
        'Analytics avanzados',
        'Soporte prioritario'
      ],
      popular: true,
      glow: true
    },
    {
      id: 'business',
      name: 'Business',
      price: '$99',
      period: '/mes',
      description: 'Dominio total del mercado',
      features: [
        'IA Enterprise',
        '500 productos',
        '7,500 mensajes IA',
        'Integraciones Premium',
        'API Access',
        'Soporte dedicado 24/7'
      ],
      popular: false
    }
  ];

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} overflow-x-hidden font-sans selection:bg-blue-500/30`}>
      <ParticleBackground />

      {/* Background Gradient for Depth */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full opacity-30" />
        <div className={`absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t ${isDark ? 'from-black' : 'from-slate-100'} via-transparent to-transparent`} />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 w-full z-50 backdrop-blur-md border-b ${t.navBg}`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <img src={nuevoLogo} alt="Wipsy" className="h-8 w-auto" />
            </div>
            <div className={`hidden md:flex items-center gap-8 text-sm font-medium ${t.textMuted}`}>
              <a href="#features" className={`hover:${isDark ? 'text-white' : 'text-slate-900'} transition-colors`}>Soluciones</a>
              <a href="#methodology" className={`hover:${isDark ? 'text-white' : 'text-slate-900'} transition-colors`}>Metodología</a>
              <a href="#pricing" className={`hover:${isDark ? 'text-white' : 'text-slate-900'} transition-colors`}>Precios</a>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className={`hidden sm:flex rounded-full px-6 ${t.buttonOutline}`}
              >
                Login
              </Button>
              <Button
                onClick={handleStartFree}
                className={`${t.buttonPrimary} font-semibold rounded-full px-6`}
              >
                Empezar Gratis
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section - Split Layout */}
      <section className="relative z-10 min-h-screen flex items-center pt-24 pb-12 px-4 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">

          {/* Left Column: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-left relative z-20"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8">
              Ventas en <br />
              <span className={`bg-clip-text text-transparent ${t.glowText} animate-gradient-x`}>
                Autopiloto.
              </span>
            </h1>

            <p className={`text-xl ${t.textMuted} max-w-xl mb-10 leading-relaxed`}>
              Convierte WhatsApp en tu mejor vendedor con IA que responde, asesora y cierra ventas automáticamente.
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <Button
                size="lg"
                className={`h-14 px-8 text-lg font-semibold rounded-full shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] transition-all duration-300 ${t.buttonPrimary}`}
                onClick={handleStartFree}
              >
                Probar Wipsy Ahora Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={`h-14 px-8 text-lg font-semibold rounded-full ${t.buttonOutline}`}
                onClick={handleViewDemo}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Probar Demo
              </Button>
            </div>

            <div className={`mt-16 pt-8 border-t ${t.border}`}>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'} uppercase tracking-widest mb-6`}>Trusted by Industry Leaders</p>
              <div className={`flex flex-wrap gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500`}>
                <span className={`text-lg font-bold font-mono hover:${t.text}`}>SHOPIFY</span>
                <span className={`text-lg font-bold font-mono hover:${t.text}`}>WOOCOMMERCE</span>
                <span className={`text-lg font-bold font-mono hover:${t.text}`}>META</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="relative flex justify-center lg:justify-end z-10"
          >
            <div className="relative">
              {/* Glow effect behind phone */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[600px] bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />

              <WhatsAppChatSimulation />
            </div>
          </motion.div>

        </div>
      </section>

      {/* Integration Logos - Only for Light Mode */}
      {!isDark && (
        <section className="relative z-10 bg-slate-50 border-t border-slate-200">
          <IntegrationLogos />
        </section>
      )}

      {/* Features Grid - Minimalist */}
      <section id="features" className={`relative z-10 py-24 px-4 sm:px-6 lg:px-8 backdrop-blur-sm border-t ${t.border} ${isDark ? 'bg-black/50' : 'bg-white/50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Potencia sin límites</h2>
            <p className={`${t.textMuted} max-w-2xl mx-auto`}>Todo lo que necesitas para escalar tu comercio conversacional.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`group p-8 rounded-3xl border transition-all duration-300 ${t.cardBg}`}
              >
                <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className={`text-xl font-semibold mb-3 ${t.text}`}>{feature.title}</h3>
                <p className={`${t.textMuted} text-sm leading-relaxed`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard & Chats Preview */}
      <section className="relative z-10 py-32 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Control Total</h2>
            <p className={`text-xl ${t.textMuted} max-w-2xl mx-auto`}>
              Monitorea cada conversación, venta y métrica en tiempo real desde nuestro dashboard futurista.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Dashboard Image */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <img
                  src="https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/dashboard.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9kYXNoYm9hcmQucG5nIiwiaWF0IjoxNzYzNjA4MjE5LCJleHAiOjE3OTUxNDQyMTl9.1--EuMkaXUeILTQdkGlaQZtW9r-G9MpQMZRVxaE99eI"
                  alt="Dashboard de Wipsy"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="mt-4 text-center">
                <h3 className="font-semibold text-lg mb-2">Panel de Control</h3>
                <p className={`text-sm ${t.textMuted}`}>Vista completa de métricas y estadísticas</p>
              </div>
            </motion.div>

            {/* Chats Image */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <img
                  src="https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/chats.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9jaGF0cy5wbmciLCJpYXQiOjE3NjM2MDgyMzEsImV4cCI6MTc5NTE0NDIzMX0.766eJfTLocGSOe8moAB4mqdwDchXy6e_coZ_0JS2f7w"
                  alt="Chats de Wipsy"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="mt-4 text-center">
                <h3 className="font-semibold text-lg mb-2">Gestión de Chats</h3>
                <p className={`text-sm ${t.textMuted}`}>Interfaz intuitiva para conversaciones</p>
              </div>
            </motion.div>
          </div>

          {/* Features List */}
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Analíticas de conversión en tiempo real",
              "Gestión de inventario centralizada",
              "Historial completo de chats",
              "Reportes automáticos de ROI"
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100/50 border border-slate-200'}`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-blue-400" />
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={`relative z-10 py-32 px-4 border-t ${t.border}`}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Planes <span className="text-blue-500">Escalables</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                whileHover={{ y: -5 }}
                className={`relative p-8 rounded-3xl border flex flex-col ${plan.glow
                  ? 'bg-blue-900/10 border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.15)]'
                  : t.pricingCard
                  } backdrop-blur-sm transition-all duration-300`}
              >
                {plan.glow && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg">
                    Recomendado
                  </div>
                )}

                <div className="mb-8">
                  <h3 className={`text-lg font-semibold ${t.text} mb-2`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${t.text}`}>{plan.price}</span>
                    <span className={`${t.textMuted2} text-sm`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm ${t.textMuted} mt-4 leading-relaxed`}>{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className={`flex items-start gap-3 text-sm ${t.textMuted}`}>
                      <Check className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePlanSelection(plan.id)}
                  className={`w-full rounded-xl font-bold py-6 transition-all ${plan.glow
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                >
                  {plan.id === 'free' ? 'Comenzar Gratis' : 'Seleccionar Plan'}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 text-center overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-b ${isDark ? 'from-black via-blue-900/10 to-black' : 'from-slate-100 via-blue-100/20 to-slate-100'} pointer-events-none`} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-4xl mx-auto px-4"
        >
          <h2 className={`text-5xl md:text-7xl font-bold mb-8 tracking-tight ${t.text}`}>
            El futuro es ahora.
          </h2>
          <p className={`text-xl ${t.textMuted} mb-12 max-w-2xl mx-auto`}>
            Únete a las empresas que están redefiniendo el comercio conversacional con IA.
          </p>
          <Button
            size="lg"
            className={`h-16 px-12 text-xl font-bold rounded-full transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] ${t.buttonPrimary}`}
            onClick={handleStartFree}
          >
            <Rocket className="mr-3 h-6 w-6" />
            Empezar Ahora
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-4 border-t ${t.border} ${t.footer} ${t.textMuted2} text-sm text-center relative z-10`}>
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <img src={nuevoLogo} alt="Logo" className="h-6 w-auto grayscale" />
          <span className="font-semibold tracking-widest">WIPSY.AI</span>
        </div>
        <p>© 2025 Wipsy AI. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default Landing;
