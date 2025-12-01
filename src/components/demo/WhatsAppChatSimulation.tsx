import { useState, useEffect, useRef } from 'react';
import { CheckCheck, Mic, Check, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  type: 'customer' | 'agent';
  content: string;
  image?: string;
  timestamp: string;
}

const messages: Message[] = [
  { id: 1, type: 'customer', content: 'Hola, busco tenis deportivos', timestamp: '10:30' },
  { id: 2, type: 'agent', content: '¡Hola! 👋 Claro que sí. Tengo estos modelos populares para ti:', timestamp: '10:30' },
  { id: 3, type: 'agent', content: 'Nike Air Max 270', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60', timestamp: '10:31' },
  { id: 4, type: 'agent', content: 'Adidas Ultraboost', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&auto=format&fit=crop&q=60', timestamp: '10:31' },
  { id: 5, type: 'customer', content: 'Me gustan los rojos. ¿Tienes talla 42?', timestamp: '10:32' },
  { id: 6, type: 'agent', content: '¡Sí! ✅ Tenemos talla 42 disponible en los Nike Air Max 270.\n\nPrecio: $150 USD\nEnvío Gratis 🚚', timestamp: '10:32' },
  { id: 7, type: 'customer', content: 'Perfecto, los quiero', timestamp: '10:33' },
  { id: 8, type: 'agent', content: 'Excelente elección. 👟\n\nGenerando link de pago seguro...', timestamp: '10:33' },
  { id: 9, type: 'agent', content: 'Aquí tienes tu orden #8821:\nhttps://wipsy.ai/pay/8821\n\nAvísame cuando realices el pago.', timestamp: '10:34' },
];

export function WhatsAppChatSimulation() {
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSaleBadge, setShowSaleBadge] = useState(false);
  const [showAIBadge, setShowAIBadge] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex >= messages.length) {
      const resetTimer = setTimeout(() => {
        setVisibleMessages([]);
        setCurrentIndex(0);
        setShowSaleBadge(false);
      }, 6000); 
      return () => clearTimeout(resetTimer);
    }

    const message = messages[currentIndex];
    const delay = message.type === 'agent' ? 1500 : 800; 

    // Lógica de Badges
    if (message.type === 'agent') {
        // Mostrar AI Badge brevemente al responder
        setShowAIBadge(true);
        setTimeout(() => setShowAIBadge(false), 2000);
        
        // Si es el mensaje final de orden (ID 9), activar Venta Cerrada
        if (message.id === 9) {
            setTimeout(() => setShowSaleBadge(true), delay + 500);
        }
    }

    if (message.type === 'agent') {
      setIsTyping(true);
      const typingTimer = setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(prev => [...prev, message]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(typingTimer);
    } else {
      const messageTimer = setTimeout(() => {
        setVisibleMessages(prev => [...prev, message]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(messageTimer);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [visibleMessages, isTyping]);

  return (
    <div className="relative mx-auto w-[300px] h-[600px] transform transition-transform hover:scale-[1.02] duration-500">
      
      {/* Floating Badges */}
      <AnimatePresence>
        {showSaleBadge && (
            <motion.div 
                initial={{ opacity: 0, x: -50, scale: 0.8 }}
                animate={{ opacity: 1, x: -80, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-24 z-50 bg-[#1f2c34] p-4 rounded-2xl border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)] backdrop-blur-md min-w-[180px]"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2.5 rounded-xl">
                        <Check className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Venta Cerrada</p>
                        <p className="text-xl font-bold text-white">$150.00</p>
                    </div>
                </div>
                {/* Confetti particles simulation could go here */}
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAIBadge && (
            <motion.div 
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 20, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                className="absolute bottom-32 -right-[140px] z-50 bg-[#1f2c34] p-3 rounded-2xl border border-blue-500/30 shadow-xl backdrop-blur-md"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg animate-pulse">
                        <Bot className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium">AI Response</p>
                        <p className="text-sm font-bold text-white">0.3s</p>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Multiple Shadow Layers for Realistic Depth */}
      <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-cyan-500/30 rounded-[3.5rem] blur-2xl opacity-60"></div>
      <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-[3.2rem] blur-xl opacity-50"></div>
      
      {/* Phone Frame with Realistic Borders */}
      <div className="relative z-10 w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#121212] to-[#0a0a0a] rounded-[3rem] overflow-hidden flex flex-col"
           style={{
             boxShadow: `
               0 0 0 8px rgba(0, 0, 0, 0.3),
               0 0 0 9px rgba(40, 40, 40, 0.8),
               0 0 0 10px rgba(0, 0, 0, 0.2),
               0 20px 60px rgba(0, 0, 0, 0.6),
               0 30px 80px rgba(0, 0, 0, 0.4),
               0 0 100px rgba(59, 130, 246, 0.15),
               inset 0 0 0 1px rgba(255, 255, 255, 0.05)
             `
           }}>
        {/* Status Bar with Notch - Full Width */}
        <div className="relative w-full bg-[#075e54] pt-2 pb-1 z-30">
          {/* Notch - Visible cutout */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-40 h-8 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] rounded-b-[2rem] z-40 border-x border-b border-white/10 shadow-inner">
            {/* Speaker/Camera inside notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-black/60 rounded-full"></div>
            <div className="absolute top-1.5 right-8 w-2 h-2 bg-black/40 rounded-full"></div>
          </div>
          
          {/* Status Bar Content */}
          <div className="relative z-20 px-6 flex justify-between items-center text-white/95 text-[11px] font-semibold">
            <span className="drop-shadow-sm">9:41</span>
            <div className="flex gap-1.5 items-center">
              <div className="w-3.5 h-3.5 bg-white/30 rounded-full border border-white/20"></div>
              <div className="w-3.5 h-3.5 bg-white/30 rounded-full border border-white/20"></div>
              <div className="w-8 h-3.5 bg-white/30 rounded-sm border border-white/20 flex items-center justify-end pr-0.5">
                <div className="w-6 h-2 bg-white/50 rounded-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Header */}
        <div className="bg-[#075e54] p-3 flex items-center gap-3 shadow-sm border-b border-white/5 z-10">
          <button className="text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-lg shadow-inner">
            👟
          </div>
          <div className="flex-1">
            <h3 className="text-white text-sm font-semibold leading-tight">Tienda Deportiva</h3>
            <p className="text-blue-400 text-xs leading-tight">En línea</p>
          </div>
          <div className="flex gap-4 text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={chatRef}
          className="flex-1 bg-[#0b141a] bg-opacity-95 overflow-y-auto p-4 space-y-3 scrollbar-hide"
          style={{
            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
            backgroundSize: "400px",
            backgroundBlendMode: "overlay"
          }}
        >
          <div className="text-center my-4">
            <span className="bg-[#1f2c34] text-[#8696a0] text-[10px] px-3 py-1 rounded-lg shadow-sm uppercase tracking-wide">Hoy</span>
          </div>

          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'customer' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm relative ${
                  message.type === 'customer'
                    ? 'bg-[#005c4b] text-white rounded-tr-none'
                    : 'bg-[#202c33] text-white rounded-tl-none'
                }`}
              >
                {message.image && (
                  <div className="mb-2 overflow-hidden rounded-lg bg-white/5">
                    <img
                      src={message.image}
                      alt="Product"
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '140px' }}
                    />
                  </div>
                )}
                <p className="text-[13px] leading-snug whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                  <span className="text-[9px]">{message.timestamp}</span>
                  {message.type === 'customer' && (
                    <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="bg-[#202c33] rounded-2xl rounded-tl-none p-3 flex gap-1.5 items-center shadow-sm">
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-[#1f2c34] p-3 flex items-center gap-3 z-20 border-t border-white/5">
          <button className="text-[#8696a0]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
          <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-sm text-[#8696a0] flex items-center justify-between">
            <span>Mensaje</span>
            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-lg">
            <Mic className="w-5 h-5" />
          </div>
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-30"></div>
      </div>
    </div>
  );
}
