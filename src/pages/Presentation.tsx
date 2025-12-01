import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi
} from '@/components/ui/carousel';
import { WhatsAppChatSimulation } from '@/components/demo/WhatsAppChatSimulation';
import { ParticleBackground } from '@/components/landing/ParticleBackground';
import nuevoLogo from '@/assets/nuevo-logo.png';
import metaTechBadge from '@/assets/meta-tech-provider-badge.png';
import {
  Bot,
  MessageCircle,
  ShoppingCart,
  Store,
  BarChart3,
  Users,
  Package,
  Zap,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Clock,
  Globe,
  Sparkles,
  Star,
  Rocket,
  Target,
  Shield,
  Award,
  Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Presentation = () => {
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const slides = [
    // Slide 1: Introducción
    {
      id: 'intro',
      content: (
        <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans selection:bg-blue-500/30 relative">
          <ParticleBackground />
          
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-cyan-600/5" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

          {/* Hero Section - Full Screen */}
          <section className="relative z-10 min-h-screen flex items-start pt-8 pb-12 px-4 lg:px-8 overflow-hidden">
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
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 animate-gradient-x">
                    Autopiloto.
                  </span>
                </h1>
                <p className="text-xl text-slate-600 max-w-xl mb-10 leading-relaxed">
                  Convierte WhatsApp en tu mejor vendedor con IA que responde, asesora y cierra ventas automáticamente.
                </p>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="bg-blue-600 text-white hover:bg-blue-700 font-semibold rounded-full px-8 py-4 text-lg shadow-xl hover:shadow-blue-500/25 transition-all"
                  >
                    <Rocket className="mr-2 h-5 w-5" />
                    Empezar Gratis
                  </Button>
                  <Button
                    onClick={() => navigate('/demo')}
                    variant="outline"
                    className="border-blue-300 bg-transparent hover:bg-blue-50 text-blue-600 font-semibold rounded-full px-8 py-4 text-lg"
                  >
                    Ver Demo
                  </Button>
                </div>

                {/* Trusted by section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Badge className="text-base px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 shadow-lg">
                    <Rocket className="h-5 w-5 mr-2" />
                    Tech Provider de Meta
            </Badge>
                  <img src={metaTechBadge} alt="Meta Tech Provider" className="h-12 w-auto opacity-90" />
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
        </div>
      )
    },
    // Slide 2: El Problema
    {
      id: 'problem',
      content: (
        <div className="h-full relative bg-gradient-to-br from-red-50 via-orange-50/50 to-yellow-50/30 overflow-hidden">
          {/* Enhanced background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-orange-600/5" />
          <div className="absolute top-20 left-20 w-32 h-32 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-red-300/5 to-orange-300/5 rounded-full blur-3xl" />
          
          <div className="relative z-10 h-full flex flex-col justify-center px-16 py-12">
            {/* Enhanced header */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <div className="inline-block relative">
                <h2 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 relative">
                  El <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-orange-600 to-red-700 animate-gradient-x">Problema</span>
                  {/* Decorative underline */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full" />
          </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  Los negocios pierden oportunidades valiosas cada día
                  </p>
                </div>
            </motion.div>
            
            {/* Enhanced problems grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: Clock,
                  title: "Atención Limitada",
                  description: "Los negocios solo pueden atender clientes durante horario laboral, perdiendo ventas en la noche y fines de semana.",
                  color: "red",
                  gradient: "from-red-50/90 to-red-100/70",
                  iconBg: "from-red-100 to-red-200",
                  border: "border-red-200/60 hover:border-red-300/80",
                  textColor: "text-red-800",
                  descColor: "text-red-700/90",
                  iconColor: "text-red-600"
                },
                {
                  icon: MessageCircle,
                  title: "WhatsApp Desorganizado",
                  description: "Gestionar pedidos, inventario y conversaciones desde WhatsApp personal es caótico e ineficiente.",
                  color: "orange",
                  gradient: "from-orange-50/90 to-orange-100/70",
                  iconBg: "from-orange-100 to-orange-200",
                  border: "border-orange-200/60 hover:border-orange-300/80",
                  textColor: "text-orange-800",
                  descColor: "text-orange-700/90",
                  iconColor: "text-orange-600"
                },
                {
                  icon: DollarSign,
                  title: "Ventas Perdidas",
                  description: "Respuestas lentas significan clientes que se van a la competencia. El 78% de los clientes compra con quien responde primero.",
                  color: "amber",
                  gradient: "from-amber-50/90 to-amber-100/70",
                  iconBg: "from-amber-100 to-amber-200",
                  border: "border-amber-200/60 hover:border-amber-300/80",
                  textColor: "text-amber-800",
                  descColor: "text-amber-700/90",
                  iconColor: "text-amber-600"
                },
                {
                  icon: Users,
                  title: "Escalabilidad Imposible",
                  description: "Contratar más personal para atender WhatsApp es costoso y no garantiza calidad consistente.",
                  color: "red",
                  gradient: "from-red-50/90 to-pink-100/70",
                  iconBg: "from-red-100 to-pink-200",
                  border: "border-red-200/60 hover:border-pink-300/80",
                  textColor: "text-red-800",
                  descColor: "text-red-700/90",
                  iconColor: "text-red-600"
                }
              ].map((problem, index) => (
                <motion.div
                  key={problem.title}
                  initial={{ opacity: 0, y: 50, scale: 0.9, rotateX: 15 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                  transition={{ 
                    delay: 0.2 + index * 0.15, 
                    duration: 0.7,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="group perspective-1000"
                >
                  <Card className={`
                    relative p-8 h-full border-2 shadow-xl hover:shadow-2xl transition-all duration-500 
                    hover:-translate-y-3 hover:rotate-1 backdrop-blur-sm overflow-hidden
                    bg-gradient-to-br ${problem.gradient} ${problem.border}
                    transform-gpu hover:scale-[1.02]
                  `}>
                    {/* Subtle glow effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${problem.iconBg} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                    
                    <div className="relative z-10 flex items-start gap-6">
                      <div className={`
                        relative p-4 rounded-2xl border shadow-lg group-hover:scale-110 group-hover:rotate-6 
                        transition-all duration-500 bg-gradient-to-br ${problem.iconBg} border-white/50
                      `}>
                        {/* Icon glow */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${problem.iconBg} rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-500`} />
                        <problem.icon className={`relative z-10 h-10 w-10 ${problem.iconColor} drop-shadow-sm`} />
              </div>
                      
                      <div className="flex-1">
                        <h3 className={`text-2xl font-bold mb-4 ${problem.textColor} group-hover:scale-105 transition-transform duration-300 origin-left`}>
                          {problem.title}
                        </h3>
                        <p className={`text-lg leading-relaxed ${problem.descColor} group-hover:text-opacity-100 transition-all duration-300`}>
                          {problem.description}
                  </p>
                </div>
              </div>
                    
                    {/* Decorative corner accent */}
                    <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${problem.iconBg} opacity-10 group-hover:opacity-20 transition-opacity duration-500`} 
                         style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
            </Card>
                </motion.div>
              ))}
                </div>
            
            {/* Enhanced bottom impact statement */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.8, type: "spring" }}
              className="mt-16 text-center"
            >
              <Card className="inline-block relative p-8 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border-2 border-red-300/50 backdrop-blur-sm shadow-2xl hover:shadow-red-200/50 transition-all duration-500 hover:scale-105 overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 via-orange-400/5 to-red-400/5 animate-pulse" />
                
                <div className="relative z-10 flex items-center gap-4">
                  <div className="text-4xl animate-bounce">💸</div>
                <div>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-600">Resultado:</span>
                    <p className="text-xl font-semibold text-red-700 mt-1">
                      Pérdida de hasta <span className="text-2xl font-bold text-red-600">40%</span> de ventas potenciales por atención deficiente
                  </p>
                </div>
              </div>
                
                {/* Decorative elements */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-400/20 rounded-full blur-sm animate-ping" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-orange-400/20 rounded-full blur-sm animate-ping" style={{ animationDelay: '0.5s' }} />
            </Card>
            </motion.div>
          </div>
        </div>
      )
    },
    // Slide 3: La Solución
    {
      id: 'solution',
      content: (
        <div className="h-full relative bg-gradient-to-br from-green-50 via-blue-50/50 to-cyan-50/30">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 via-blue-600/5 to-cyan-600/5" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 h-full flex flex-col justify-start px-16 py-4 pt-16">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-6"
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Badge className="text-base px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white border-0">
                  <Zap className="h-4 w-4 mr-2" />
                  Plug & Play
            </Badge>
                <Badge className="text-base px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">
                  <Clock className="h-4 w-4 mr-2" />
                  Configuración en 5 minutos
            </Badge>
          </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
                La Solución: <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 via-blue-600 to-cyan-600">
                  Wipsy AI Agent
                </span>
          </h2>
              
              <p className="text-xl text-slate-600 mb-4 max-w-4xl leading-relaxed">
            Un asistente virtual inteligente que atiende tus clientes 24/7, 
            procesa pedidos automáticamente y nunca deja escapar una venta.
          </p>
            </motion.div>
            
            {/* Main Content - Features and Phone */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="space-y-6 pl-8"
              >
                {[
                  {
                    icon: Bot,
                    title: "Atención Instantánea",
                    description: "Responde consultas en menos de 2 segundos, las 24 horas del día. Reconoce imágenes y audio para una experiencia completa",
                    color: "blue"
                  },
                  {
                    icon: ShoppingCart,
                    title: "Genera Pedidos Automáticamente",
                    description: "Muestra productos, responde dudas y crea pedidos sin intervención humana",
                    color: "green"
                  },
                  {
                    icon: Package,
                    title: "Inventario en Tiempo Real",
                    description: "Solo ofrece productos disponibles, actualizado al instante",
                    color: "cyan"
                  },
                  {
                    icon: Sparkles,
                    title: "Aprende de tu Negocio",
                    description: "Personaliza respuestas según tu catálogo y estilo de ventas",
                    color: "purple"
                  }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 + 0.5 }}
                    className="flex items-start gap-4"
                  >
                    <div className={`p-3 bg-${item.color}-100 rounded-xl shrink-0`}>
                      <item.icon className={`h-8 w-8 text-${item.color}-600`} />
                </div>
                <div>
                      <h3 className="text-2xl font-bold mb-2 text-slate-900">{item.title}</h3>
                      <p className="text-slate-600 text-lg leading-relaxed">
                        {item.description}
                  </p>
                </div>
                  </motion.div>
                ))}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex items-start justify-center -mt-24"
              >
                <div className="relative transform scale-125">
                  <div className="absolute -inset-6 bg-gradient-to-r from-green-500/20 via-blue-500/20 to-cyan-500/20 rounded-3xl blur-3xl" />
                  <WhatsAppChatSimulation />
              </div>
              </motion.div>
                </div>
          </div>
        </div>
      )
    },
    // Slide 4: Cliente Ideal y Ventaja Competitiva
    {
      id: 'target-audience',
      content: (
        <div className="h-full relative bg-gradient-to-br from-purple-50 via-indigo-50/50 to-blue-50/30 overflow-hidden">
          {/* Background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-blue-600/5" />
          <div className="absolute top-20 right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-300/5 to-blue-300/5 rounded-full blur-3xl" />
          
          <div className="relative z-10 h-full flex flex-col justify-center px-16 py-12">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6">
                ¿Para <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">Quién</span> es Wipsy?
              </h2>
              <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
                Diseñado específicamente para emprendedores que venden por WhatsApp
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
              {/* Left Column - Cliente Ideal */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <Card className="p-8 bg-gradient-to-br from-purple-50/90 to-indigo-100/70 border-2 border-purple-200/60 shadow-2xl hover:shadow-purple-200/50 transition-all duration-500 hover:scale-[1.02] backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl border border-purple-300/30">
                      <Target className="h-10 w-10 text-purple-600" />
                </div>
                    <h3 className="text-3xl font-bold text-purple-800">Cliente Ideal</h3>
              </div>
                  
                  <div className="space-y-6">
                    {[
                      {
                        icon: Store,
                        title: "Tiendas Online",
                        description: "Cualquier persona que tenga una tienda en línea y venda productos por WhatsApp"
                      },
                      {
                        icon: MessageCircle,
                        title: "Atención por WhatsApp",
                        description: "Negocios que atienden clientes directamente por WhatsApp y buscan automatizar"
                      },
                      {
                        icon: Zap,
                        title: "Publicidad a WhatsApp",
                        description: "Empresas que pautan en redes sociales dirigiendo tráfico directamente a WhatsApp"
                      }
                    ].map((item, index) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                        className="flex items-start gap-4 p-4 bg-white/50 rounded-xl border border-purple-200/30 hover:bg-white/70 transition-all duration-300"
                      >
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <item.icon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                          <h4 className="text-lg font-bold text-purple-800 mb-1">{item.title}</h4>
                          <p className="text-purple-700/80 leading-relaxed">{item.description}</p>
                </div>
                      </motion.div>
                    ))}
              </div>
                </Card>
              </motion.div>

              {/* Right Column - Ventaja Competitiva */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <Card className="p-8 bg-gradient-to-br from-blue-50/90 to-indigo-100/70 border-2 border-blue-200/60 shadow-2xl hover:shadow-blue-200/50 transition-all duration-500 hover:scale-[1.02] backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl border border-blue-300/30">
                      <Crown className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-blue-800">Nuestra Ventaja</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Competencia */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                      className="p-4 bg-white/50 rounded-xl border border-blue-200/30"
                    >
                      <h4 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Tenemos Competencia
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {['Yavendio', 'ManyChat', 'Mercately', 'Darwin AI'].map((competitor) => (
                          <span key={competitor} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                            {competitor}
                          </span>
                        ))}
                      </div>
                      <p className="text-blue-700/80 text-sm">Pero ninguno ofrece lo que nosotros sí...</p>
                    </motion.div>

                    {/* Ventajas */}
                    {[
                      {
                        icon: Zap,
                        title: "Plug & Play Real",
                        description: "Configuración en 5 minutos, sin complicaciones técnicas ni integraciones complejas",
                        highlight: true
                      },
                      {
                        icon: DollarSign,
                        title: "Precio Competitivo",
                        description: "La mejor relación calidad-precio del mercado, accesible para cualquier negocio",
                        highlight: true
                      },
                      {
                        icon: Star,
                        title: "Experiencia Completa",
                        description: "No solo chatbot, sino una plataforma integral de ventas por WhatsApp"
                      }
                    ].map((advantage, index) => (
                      <motion.div
                        key={advantage.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
                          advantage.highlight 
                            ? 'bg-gradient-to-r from-blue-100/80 to-indigo-100/80 border-blue-300/50 hover:border-blue-400/70' 
                            : 'bg-white/50 border-blue-200/30 hover:bg-white/70'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${
                          advantage.highlight ? 'bg-blue-200' : 'bg-blue-100'
                        }`}>
                          <advantage.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                          <h4 className={`text-lg font-bold mb-1 ${
                            advantage.highlight ? 'text-blue-900' : 'text-blue-800'
                          }`}>
                            {advantage.title}
                            {advantage.highlight && <span className="ml-2 text-sm bg-blue-600 text-white px-2 py-1 rounded-full">Exclusivo</span>}
                          </h4>
                          <p className="text-blue-700/80 leading-relaxed">{advantage.description}</p>
                </div>
                      </motion.div>
                    ))}
              </div>
                </Card>
              </motion.div>
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="mt-16 text-center"
            >
              <Card className="inline-block p-6 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border-2 border-purple-300/50 backdrop-blur-sm shadow-2xl hover:shadow-purple-200/50 transition-all duration-500 hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">🎯</div>
                  <div>
                    <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                      ¿Te identificas? Wipsy es para ti
                    </p>
                    <p className="text-lg text-slate-600 mt-1">
                      Únete a cientos de negocios que ya están vendiendo más con menos esfuerzo
                    </p>
            </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      )
    },
    // Slide 5: Plataforma Unificada
    {
      id: 'platform',
      content: (
        <div className="h-full relative bg-gradient-to-br from-purple-50 via-blue-50/50 to-indigo-50/30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-blue-600/5 to-indigo-600/5" />
          
          <div className="relative z-10 h-full flex flex-col justify-center px-16 py-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4">
                Todo tu negocio en <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600">
                  una plataforma
                </span>
          </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Gestiona, analiza y optimiza desde un solo lugar
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
              {[
                {
                  image: "https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/dashboard.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9kYXNoYm9hcmQucG5nIiwiaWF0IjoxNzYzNjA4MjE5LCJleHAiOjE3OTUxNDQyMTl9.1--EuMkaXUeILTQdkGlaQZtW9r-G9MpQMZRVxaE99eI",
                  title: "Dashboard Completo",
                  description: "Visualiza ventas, pedidos y métricas en tiempo real con gráficos interactivos",
                  icon: BarChart3,
                  color: "purple"
                },
                {
                  image: "https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/chats.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9jaGF0cy5wbmciLCJpYXQiOjE3NjM2MDgyMzEsImV4cCI6MTc5NTE0NDIzMX0.766eJfTLocGSOe8moAB4mqdwDchXy6e_coZ_0JS2f7w",
                  title: "Gestión de Chats",
                  description: "Supervisa conversaciones y toma control cuando sea necesario con interfaz intuitiva",
                  icon: MessageCircle,
                  color: "blue"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 + 0.3 }}
                >
                  <Card className="border-2 border-slate-200 hover:border-blue-300 transition-all hover:shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
                    <div className="relative group cursor-pointer" onClick={() => setSelectedImage({ src: item.image, title: item.title })}>
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                      <div className="relative rounded-xl overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-2">
                            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
              </div>
                        </div>
                      </div>
                    </div>
              <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 bg-${item.color}-100 rounded-lg`}>
                          <item.icon className={`h-6 w-6 text-${item.color}-600`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
              </div>
                      <p className="text-slate-600 leading-relaxed">
                        {item.description}
                </p>
              </div>
            </Card>
                </motion.div>
              ))}
          </div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex justify-center"
            >
              <Card className="p-8 bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-200 max-w-3xl">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl">
                    <Globe className="h-12 w-12 text-white" />
          </div>
                <div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-900">Integración con Shopify</h3>
                    <p className="text-lg text-slate-600">
                    Sincroniza productos, inventario y pedidos automáticamente con tu tienda Shopify
                  </p>
                </div>
              </div>
            </Card>
            </motion.div>
          </div>
        </div>
      )
    },
    // Slide 6: Modelo de Negocio
    {
      id: 'business-model',
      content: (
        <div className="h-full relative bg-gradient-to-br from-indigo-50 via-purple-50/50 to-pink-50/30">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-purple-600/5 to-pink-600/5" />
          
          <div className="relative z-10 h-full flex flex-col justify-center px-16 py-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4">
                Modelo de <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">Negocio</span>
          </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Planes flexibles que crecen con tu negocio
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="p-8 text-center border-2 border-slate-200 hover:border-green-300 transition-all hover:shadow-xl bg-white/80 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-slate-900 mb-2">Gratis</div>
                  <div className="text-5xl font-bold text-green-600 mb-2">$0</div>
                  <div className="text-sm text-slate-500 mb-6">/mes</div>
                  <ul className="text-left space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">20 productos</span>
                </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">100 mensajes IA</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Soporte básico</span>
                </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">WhatsApp Business</span>
                </li>
              </ul>
                  <Button variant="outline" className="w-full border-green-300 text-green-600 hover:bg-green-50">
                    Empezar Gratis
                  </Button>
            </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="p-8 text-center border-2 border-slate-200 hover:border-indigo-300 transition-all hover:shadow-xl bg-white/80 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-slate-900 mb-2">Starter</div>
                  <div className="text-5xl font-bold text-indigo-600 mb-2">$29</div>
                  <div className="text-sm text-slate-500 mb-6">/mes</div>
                  <ul className="text-left space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">100 productos</span>
                </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">1,500 mensajes IA</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Soporte por chat</span>
                </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Integración WhatsApp</span>
                </li>
              </ul>
                  <Button variant="outline" className="w-full border-indigo-300 text-indigo-600 hover:bg-indigo-50">
                    Empezar
                  </Button>
            </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="p-8 text-center border-2 border-purple-300 hover:border-purple-400 transition-all hover:shadow-2xl bg-white shadow-xl relative">
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    Más Popular
                  </Badge>
                  <div className="text-2xl font-bold text-slate-900 mb-2">Pro</div>
                  <div className="text-5xl font-bold text-purple-600 mb-2">$49</div>
                  <div className="text-sm text-slate-500 mb-6">/mes</div>
                  <ul className="text-left space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">500 productos</span>
                </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">5,000 mensajes IA</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Soporte prioritario</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Integración Shopify</span>
                </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Automatizaciones avanzadas</span>
                </li>
              </ul>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                    Empezar
                  </Button>
            </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="p-8 text-center border-2 border-slate-200 hover:border-pink-300 transition-all hover:shadow-xl bg-white/80 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-slate-900 mb-2">Enterprise</div>
                  <div className="text-5xl font-bold text-pink-600 mb-2">$99</div>
                  <div className="text-sm text-slate-500 mb-6">/mes</div>
                  <ul className="text-left space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Productos ilimitados</span>
                </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">15,000 mensajes IA</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Soporte dedicado</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">API personalizada</span>
                </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">Múltiples integraciones</span>
                </li>
              </ul>
                  <Button variant="outline" className="w-full border-pink-300 text-pink-600 hover:bg-pink-50">
                    Contactar
                  </Button>
            </Card>
              </motion.div>
            </div>

            {/* Additional Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            >
              <div className="text-center">
                <div className="p-4 bg-green-100 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Sin Compromiso</h3>
                <p className="text-slate-600 text-sm">Cancela en cualquier momento sin penalizaciones</p>
              </div>
              <div className="text-center">
                <div className="p-4 bg-blue-100 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Setup Gratis</h3>
                <p className="text-slate-600 text-sm">Configuración e integración incluida en todos los planes</p>
              </div>
              <div className="text-center">
                <div className="p-4 bg-purple-100 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Garantía 30 días</h3>
                <p className="text-slate-600 text-sm">Si no estás satisfecho, te devolvemos tu dinero</p>
              </div>
            </motion.div>
          </div>
        </div>
      )
    },
    // Slide 7: Validación / Resultados
    {
      id: 'validation',
      content: (
        <div className="h-full relative bg-gradient-to-br from-emerald-50 via-blue-50/50 to-teal-50/30">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-blue-600/5 to-teal-600/5" />
          
          <div className="relative z-10 h-full flex flex-col justify-center px-16 py-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4">
                Resultados <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-blue-600 to-teal-600">Comprobados</span>
          </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Métricas reales que demuestran el éxito de Wipsy
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="p-8 text-center border-2 border-emerald-200 hover:border-emerald-300 transition-all hover:shadow-xl bg-white/90 backdrop-blur-sm">
                  <div className="p-4 bg-emerald-100 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <DollarSign className="h-12 w-12 text-emerald-600" />
                  </div>
                  <div className="text-5xl font-bold text-emerald-600 mb-2">$300</div>
                  <p className="text-lg text-slate-600 font-medium">
                MRR (Monthly Recurring Revenue)
              </p>
            </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="p-8 text-center border-2 border-blue-200 hover:border-blue-300 transition-all hover:shadow-xl bg-white/90 backdrop-blur-sm">
                  <div className="p-4 bg-blue-100 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-12 w-12 text-blue-600" />
                  </div>
                  <div className="text-5xl font-bold text-blue-600 mb-2">6</div>
                  <p className="text-lg text-slate-600 font-medium">
                Clientes activos
              </p>
            </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="p-8 text-center border-2 border-teal-200 hover:border-teal-300 transition-all hover:shadow-xl bg-white/90 backdrop-blur-sm">
                  <div className="p-4 bg-teal-100 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-12 w-12 text-teal-600" />
                  </div>
                  <div className="text-5xl font-bold text-teal-600 mb-2">3</div>
                  <p className="text-lg text-slate-600 font-medium">
                Clientes con 2+ meses pagando
              </p>
            </Card>
              </motion.div>
          </div>

            {/* Nuevas funcionalidades basadas en feedback */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="max-w-6xl mx-auto"
            >
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-slate-900 mb-3">Innovación Constante</h3>
                <p className="text-lg text-slate-600">Nuevas funcionalidades desarrolladas gracias al feedback de nuestros clientes</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <Card className="p-6 border-2 border-purple-200 hover:border-purple-300 transition-all hover:shadow-xl bg-white/90 backdrop-blur-sm">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-100 rounded-xl shrink-0">
                        <Sparkles className="h-8 w-8 text-purple-600" />
          </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">Reconocimiento Visual de Productos</h4>
                        <p className="text-slate-600 mb-4">
                          El agente ahora puede comparar imágenes enviadas por clientes con tu catálogo para identificar productos automáticamente y ofrecer alternativas similares.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                          <Star className="h-4 w-4" />
                          Solicitado por clientes
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  <Card className="p-6 border-2 border-indigo-200 hover:border-indigo-300 transition-all hover:shadow-xl bg-white/90 backdrop-blur-sm cursor-pointer"
                        onClick={() => setSelectedImage({ 
                          src: "https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/Captura%20de%20pantalla%202025-11-21%20a%20la(s)%207.15.35%20a.m..png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9DYXB0dXJhIGRlIHBhbnRhbGxhIDIwMjUtMTEtMjEgYSBsYShzKSA3LjE1LjM1IGEubS4ucG5nIiwiaWF0IjoxNzYzNzI3NTAzLCJleHAiOjE3OTUyNjM1MDN9._NJSwaDBK8PDpMDHSQcZiLdk_rmCFjA7A5HKSC7EiaM", 
                          title: "Automatizaciones Avanzadas" 
                        })}
                  >
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                      <div className="relative rounded-xl overflow-hidden mb-4">
                        <img 
                          src="https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/Captura%20de%20pantalla%202025-11-21%20a%20la(s)%207.15.35%20a.m..png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9DYXB0dXJhIGRlIHBhbnRhbGxhIDIwMjUtMTEtMjEgYSBsYShzKSA3LjE1LjM1IGEubS4ucG5nIiwiaWF0IjoxNzYzNzI3NTAzLCJleHAiOjE3OTUyNjM1MDN9._NJSwaDBK8PDpMDHSQcZiLdk_rmCFjA7A5HKSC7EiaM" 
                          alt="Automatizaciones" 
                          className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-2">
                            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 rounded-xl shrink-0">
                        <Zap className="h-8 w-8 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">Flujos de Automatización</h4>
                        <p className="text-slate-600 mb-4">
                          Crea secuencias personalizadas de mensajes para diferentes escenarios: bienvenida, seguimiento, recuperación de carritos abandonados y más.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                          <Star className="h-4 w-4" />
                          Funcionalidad más solicitada
                        </div>
                      </div>
            </div>
          </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      )
    },
    // Slide 8: Próximos Pasos / CTA
    {
      id: 'next-steps',
      content: (
        <div className="h-full relative overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50/50 to-green-50/30">
          <ParticleBackground />
          
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-cyan-600/5 to-green-600/5" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-16 py-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h2 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
                ¿Listo para transformar <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-green-600">
                  tu negocio?
                </span>
          </h2>
              <p className="text-2xl text-slate-600 mb-12 max-w-4xl leading-relaxed">
            Únete a más de 1,000 negocios que ya están vendiendo más con Wipsy
          </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-6 mb-16"
            >
            <Button 
              size="lg" 
                className="text-xl px-12 py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-2xl hover:shadow-blue-500/25 transition-all"
              onClick={() => navigate('/auth')}
            >
                <Rocket className="mr-3 h-6 w-6" />
              Comenzar Prueba Gratuita
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
                className="text-xl px-12 py-6 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 transition-all"
                onClick={() => navigate('/demo')}
            >
                <Target className="mr-3 h-6 w-6" />
              Agendar Demo
            </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl"
            >
              {[
                {
                  icon: Clock,
                  value: "5 min",
                  description: "Configuración completa",
                  color: "blue"
                },
                {
                  icon: Shield,
                  value: "Sin tarjeta",
                  description: "Para empezar gratis",
                  color: "green"
                },
                {
                  icon: Award,
                  value: "24/7",
                  description: "Soporte incluido",
                  color: "purple"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 + 0.7 }}
                  className="text-center"
                >
                  <div className={`inline-flex p-4 bg-${item.color}-100 rounded-2xl mb-4`}>
                    <item.icon className={`h-8 w-8 text-${item.color}-600`} />
          </div>
                  <div className={`text-4xl font-bold text-${item.color}-600 mb-2`}>{item.value}</div>
                  <div className="text-slate-600 text-lg">{item.description}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="h-screen w-screen bg-slate-50 overflow-hidden flex flex-col">
      {/* Header with logo and navigation */}
      <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <img src={nuevoLogo} alt="Wipsy" className="h-10 w-auto" />
          <div className="h-6 w-[1px] bg-slate-300" />
          <Badge variant="secondary" className="text-sm px-3 py-1 bg-slate-100 text-slate-700">
            Slide {current} de {slides.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/landing')}
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Ir a Landing
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 hover:from-blue-700 hover:to-cyan-700"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Comenzar
          </Button>
        </div>
      </header>

      {/* Carousel with full-screen slides */}
      <div className="flex-1 overflow-hidden">
        <Carousel 
          className="h-full w-full"
          setApi={setApi}
          opts={{
            align: 'start',
            loop: true,
          }}
        >
          <CarouselContent className="h-full">
            {slides.map((slide) => (
              <CarouselItem key={slide.id} className="h-full">
                <div className="h-full w-full">
                  {slide.content}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-6 h-14 w-14 bg-white/90 backdrop-blur-sm border-2 border-slate-200 hover:bg-white shadow-lg" />
          <CarouselNext className="right-6 h-14 w-14 bg-white/90 backdrop-blur-sm border-2 border-slate-200 hover:bg-white shadow-lg" />
        </Carousel>
      </div>

      {/* Progress indicator */}
      <div className="h-3 bg-slate-200 flex-shrink-0">
        <div 
          className="h-full bg-gradient-to-r from-blue-600 via-cyan-600 to-green-600 transition-all duration-500 ease-out"
          style={{ width: `${(current / slides.length) * 100}%` }}
        />
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-6xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 transition-colors shadow-lg"
              >
                <X className="w-6 h-6 text-slate-700" />
              </button>
              
              {/* Image */}
              <div className="relative">
                <img
                  src={selectedImage.src}
                  alt={selectedImage.title}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </div>
              
              {/* Title */}
              <div className="p-6 bg-white border-t border-slate-200">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{selectedImage.title}</h3>
                <p className="text-slate-600">
                  {selectedImage.title === 'Dashboard Completo' 
                    ? 'Visualiza ventas, pedidos y métricas en tiempo real con gráficos interactivos'
                    : 'Supervisa conversaciones y toma control cuando sea necesario con interfaz intuitiva'
                  }
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Presentation;
