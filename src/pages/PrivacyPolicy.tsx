import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const PrivacyPolicy = () => {
  const sections = [
    {
      title: "1. Información que Recopilamos",
      content: [
        "Recopilamos la siguiente información para proporcionar y mejorar nuestros servicios:",
        "• Información de cuenta: nombre, correo electrónico, número de teléfono y contraseña encriptada",
        "• Mensajes de WhatsApp: contenido de conversaciones, imágenes, audios y videos compartidos",
        "• Datos de clientes: información de contacto, historial de conversaciones y preferencias",
        "• Información de productos: catálogos, precios, inventarios y descripciones",
        "• Datos de pedidos: detalles de transacciones, historial de compras y estados de entrega",
        "• Información de pago: procesada de forma segura a través de Stripe (no almacenamos datos de tarjetas)",
        "• Datos de uso: análisis de interacciones con la plataforma y métricas de rendimiento"
      ]
    },
    {
      title: "2. Integración con WhatsApp",
      content: [
        "Nuestra plataforma se integra con WhatsApp a través de:",
        "• Infraestructura de mensajería: para gestionar conversaciones de WhatsApp Business",
        "• Meta WhatsApp Business API: integración oficial con Meta para comunicaciones empresariales",
        "• Los mensajes se almacenan de forma segura en nuestra base de datos",
        "• Cumplimos con las políticas de privacidad y términos de servicio de Meta",
        "• Todas las comunicaciones están protegidas mediante encriptación"
      ]
    },
    {
      title: "3. Uso de Inteligencia Artificial",
      content: [
        "Utilizamos tecnología de IA para:",
        "• Generación de respuestas automáticas y sugerencias conversacionales",
        "• Análisis de sentimiento y contexto de conversaciones",
        "• Búsqueda semántica de productos mediante embeddings vectoriales",
        "• Reconocimiento y búsqueda de imágenes de productos",
        "• Automatización de procesos de venta y atención al cliente",
        "• Los datos procesados por IA se utilizan exclusivamente para mejorar tu experiencia",
        "• No compartimos datos de IA con terceros sin tu consentimiento"
      ]
    },
    {
      title: "4. Integraciones con Terceros",
      content: [
        "Trabajamos con los siguientes servicios de terceros:",
        "• Supabase: almacenamiento seguro de datos y autenticación",
        "• Stripe: procesamiento seguro de pagos y suscripciones",
        "• Shopify: sincronización de productos, inventario y pedidos (opcional)",
        "• Meta (WhatsApp): envío y recepción de mensajes empresariales",
        "• Proveedores de infraestructura de mensajería: gestión de comunicaciones de WhatsApp",
        "Cada servicio tiene sus propias políticas de privacidad que complementan la nuestra"
      ]
    },
    {
      title: "5. Uso de la Información",
      content: [
        "Utilizamos la información recopilada para:",
        "• Proporcionar y mantener nuestros servicios",
        "• Procesar pedidos y gestionar transacciones",
        "• Enviar notificaciones importantes sobre tu cuenta",
        "• Mejorar nuestros servicios mediante análisis y machine learning",
        "• Personalizar tu experiencia en la plataforma",
        "• Prevenir fraude y garantizar la seguridad",
        "• Cumplir con obligaciones legales y regulatorias"
      ]
    },
    {
      title: "6. Protección de Datos",
      content: [
        "Implementamos medidas de seguridad robustas:",
        "• Encriptación de datos en tránsito y en reposo",
        "• Contraseñas protegidas mediante hashing seguro",
        "• Acceso restringido a información sensible mediante políticas RLS (Row Level Security)",
        "• Autenticación de dos factores disponible",
        "• Monitoreo continuo de seguridad y auditorías regulares",
        "• Backups automáticos y redundancia de datos",
        "• Certificados SSL/TLS para todas las comunicaciones"
      ]
    },
    {
      title: "7. Almacenamiento y Retención de Datos",
      content: [
        "• Los datos se almacenan en servidores seguros de Supabase",
        "• Conservamos la información mientras tu cuenta esté activa",
        "• Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento",
        "• Algunos datos pueden conservarse por requisitos legales o contables",
        "• Los backups se mantienen por períodos específicos según nuestras políticas"
      ]
    },
    {
      title: "8. Compartir Información",
      content: [
        "No vendemos ni alquilamos tu información personal. Compartimos datos solo cuando:",
        "• Es necesario para proporcionar el servicio (ej: procesar pagos con Stripe)",
        "• Tenemos tu consentimiento explícito",
        "• Se requiere por ley o proceso legal",
        "• Es necesario para proteger nuestros derechos legales",
        "• Se transfiere en caso de fusión o adquisición empresarial"
      ]
    },
    {
      title: "9. Cookies y Tecnologías de Rastreo",
      content: [
        "Utilizamos cookies y tecnologías similares para:",
        "• Mantener tu sesión activa de forma segura",
        "• Recordar tus preferencias y configuraciones",
        "• Analizar el uso de la plataforma y mejorar el rendimiento",
        "• Proporcionar funcionalidades personalizadas",
        "Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar algunas funcionalidades"
      ]
    },
    {
      title: "10. Tus Derechos",
      content: [
        "Tienes derecho a:",
        "• Acceder a tu información personal",
        "• Corregir datos incorrectos o desactualizados",
        "• Solicitar la eliminación de tu cuenta y datos",
        "• Exportar tus datos en formato portable",
        "• Oponerte al procesamiento de ciertos datos",
        "• Retirar tu consentimiento en cualquier momento",
        "• Presentar quejas ante autoridades de protección de datos"
      ]
    },
    {
      title: "11. Privacidad de Menores",
      content: [
        "• Nuestros servicios están dirigidos a empresas y profesionales mayores de 18 años",
        "• No recopilamos intencionalmente información de menores de edad",
        "• Si detectamos datos de menores, los eliminaremos inmediatamente",
        "• Los padres pueden contactarnos para solicitar la eliminación de datos de menores"
      ]
    },
    {
      title: "12. Transferencias Internacionales",
      content: [
        "• Tus datos pueden ser procesados en servidores ubicados en diferentes países",
        "• Garantizamos protecciones adecuadas según estándares internacionales",
        "• Cumplimos con regulaciones de GDPR, CCPA y leyes locales aplicables"
      ]
    },
    {
      title: "13. Cambios a esta Política",
      content: [
        "• Podemos actualizar esta política periódicamente",
        "• Te notificaremos sobre cambios significativos",
        "• La fecha de última actualización se muestra al inicio de este documento",
        "• El uso continuado del servicio implica aceptación de cambios"
      ]
    },
    {
      title: "14. Contacto",
      content: [
        "Para preguntas sobre esta política o ejercer tus derechos, contáctanos en:",
        "• Email: privacy@tuempresa.com",
        "• Responderemos solicitudes en un plazo máximo de 30 días",
        "• Para solicitudes urgentes, indica 'URGENTE' en el asunto"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Política de Privacidad</h1>
          <p className="text-muted-foreground">
            Última actualización: {new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Introduction Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Compromiso con tu Privacidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              En nuestra plataforma, nos tomamos muy en serio la protección de tu información personal. 
              Esta Política de Privacidad describe cómo recopilamos, usamos, compartimos y protegemos 
              tus datos cuando utilizas nuestros servicios de gestión de WhatsApp Business, comercio 
              electrónico y automatización con inteligencia artificial.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Al utilizar nuestros servicios, aceptas las prácticas descritas en esta política. 
              Te recomendamos leerla detenidamente y contactarnos si tienes alguna pregunta.
            </p>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.content.map((paragraph, pIndex) => (
                    <p 
                      key={pIndex} 
                      className={`text-muted-foreground leading-relaxed ${
                        paragraph.startsWith('•') ? 'ml-4' : ''
                      }`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Note */}
        <Card className="mt-8 bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Esta política de privacidad es parte de nuestros{' '}
              <Link to="/terms" className="text-primary hover:underline">
                Términos y Condiciones
              </Link>
              . Al usar nuestros servicios, aceptas ambos documentos.
            </p>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Tu Empresa. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
