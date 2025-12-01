import { useState } from 'react';
import { HelpCircle, Calendar, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CALENDAR_URL = 'https://calendly.com/felipe-rodres/30min';
const WHATSAPP_NUMBER = '+19788386230';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export const FloatingHelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Overlay cuando está abierto */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menú de opciones */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[280px] animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3 px-4"
              onClick={() => {
                window.open(CALENDAR_URL, '_blank');
                setIsOpen(false);
              }}
            >
              <Calendar className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium text-foreground">Agendar reunión</div>
                <div className="text-xs text-muted-foreground">Habla con nuestro equipo</div>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3 px-4"
              onClick={() => {
                window.open(WHATSAPP_URL, '_blank');
                setIsOpen(false);
              }}
            >
              <MessageCircle className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-foreground">Contactar soporte</div>
                <div className="text-xs text-muted-foreground">WhatsApp: +1 978-838-6230</div>
              </div>
            </Button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <HelpCircle className="h-6 w-6" />
        )}
      </Button>
    </>
  );
};
