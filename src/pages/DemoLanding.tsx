import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, MessageSquare, Zap, TrendingUp, Star } from 'lucide-react';
import { DemoQuestionnaire } from '@/components/demo/DemoQuestionnaire';
import { WhatsAppChatSimulation } from '@/components/demo/WhatsAppChatSimulation';
import wipsyLogo from '@/assets/wipsy-logo.png';
import { trackSubmitForm, trackViewContent } from '@/utils/tiktokPixel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export default function DemoLanding() {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const autoplayPlugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  useEffect(() => {
    // Track page view when component mounts
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.page();
    }
    trackViewContent('service', {
      contentId: 'demo_landing',
      contentName: 'Demo Landing Page',
      value: 0,
      currency: 'USD'
    });
  }, []);

  const handleScheduleDemo = () => {
    trackSubmitForm('demo_booking');
    trackViewContent('service', {
      contentId: 'demo_booking',
      contentName: 'Demo Booking Form',
      value: 0,
      currency: 'USD'
    });
    setShowQuestionnaire(true);
  };

  if (showQuestionnaire) {
    return <DemoQuestionnaire />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <img src={wipsyLogo} alt="Wipsy" className="h-8" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Tu agente de ventas que trabaja 24/7 por WhatsApp
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed">
              Un agente de IA que <span className="text-primary font-semibold">muestra productos, responde preguntas 
              y genera ventas automáticamente</span> mientras duermes 🚀
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                <p className="text-lg">Agente de ventas con IA disponible 24/7 por WhatsApp</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                <p className="text-lg">Muestra productos con imágenes y detalles automáticamente</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                <p className="text-lg">Genera y procesa pedidos sin intervención humana</p>
              </div>
            </div>

            <Button
              size="lg"
              className="h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={handleScheduleDemo}
            >
              Probar Agente y Reservar Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Right Content - WhatsApp Chat Simulation */}
          <div className="flex items-center justify-center">
            <WhatsAppChatSimulation />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border/40 bg-card/30 backdrop-blur-sm py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl lg:text-4xl font-bold mb-4">
            Esto dicen los clientes de nosotros
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Más de 100+ negocios en Latinoamérica confían en Wipsy
          </p>
          
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[autoplayPlugin.current]}
            className="w-full max-w-5xl mx-auto"
          >
            <CarouselContent>
              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="p-6 h-full">
                  <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      "Wipsy revolucionó nuestra forma de vender. Ahora atendemos clientes 24/7 sin necesidad de contratar más personal."
                    </p>
                    <div>
                      <p className="font-semibold">María González</p>
                      <p className="text-sm text-muted-foreground">Dueña, Boutique Luna</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="p-6 h-full">
                  <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      "Nuestras ventas aumentaron un 40% desde que implementamos el agente de IA. Los clientes aman la atención inmediata."
                    </p>
                    <div>
                      <p className="font-semibold">Carlos Ramírez</p>
                      <p className="text-sm text-muted-foreground">CEO, Tech Store MX</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="p-6 h-full">
                  <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      "La mejor inversión que hemos hecho. El agente responde todo automáticamente y genera pedidos mientras dormimos."
                    </p>
                    <div>
                      <p className="font-semibold">Ana Martínez</p>
                      <p className="text-sm text-muted-foreground">Fundadora, Naturalia</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="p-6 h-full">
                  <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      "Increíble cómo el agente entiende a los clientes y les muestra exactamente lo que buscan. Es como tener un vendedor experto siempre disponible."
                    </p>
                    <div>
                      <p className="font-semibold">Roberto Silva</p>
                      <p className="text-sm text-muted-foreground">Director, Electro Shop</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="p-6 h-full">
                  <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      "Lo mejor es que puedo concentrarme en crecer el negocio mientras Wipsy se encarga de las ventas básicas. Es un cambio total."
                    </p>
                    <div>
                      <p className="font-semibold">Laura Pérez</p>
                      <p className="text-sm text-muted-foreground">Propietaria, Moda & Estilo</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="p-6 h-full">
                  <div className="bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      "Nuestros clientes están fascinados con la rapidez de respuesta. Wipsy ha transformado completamente nuestra operación de ventas."
                    </p>
                    <div>
                      <p className="font-semibold">Diego Morales</p>
                      <p className="text-sm text-muted-foreground">Gerente, Importadora Del Sur</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            Todo lo que necesitas para vender más por WhatsApp
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Una plataforma completa para gestionar tus conversaciones y ventas
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-8 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Agente de Ventas 24/7</h3>
            <p className="text-muted-foreground">
              Un vendedor virtual que atiende a tus clientes en todo momento, incluso mientras duermes
            </p>
          </div>

          <div className="p-8 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Muestra Productos</h3>
            <p className="text-muted-foreground">
              Envía automáticamente imágenes, precios y detalles de productos según lo que busca el cliente
            </p>
          </div>

          <div className="p-8 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Genera Ventas</h3>
            <p className="text-muted-foreground">
              Procesa pedidos completos automáticamente, desde la consulta hasta la confirmación
            </p>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="border-t border-border/40 bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            ¿Listo para transformar tus ventas por WhatsApp?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Agenda una demo personalizada y descubre cómo Wipsy puede ayudar a tu negocio
          </p>
          <Button
            size="lg"
            className="h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            onClick={handleScheduleDemo}
          >
            Probar Agente y Reservar Demo
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Wipsy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
