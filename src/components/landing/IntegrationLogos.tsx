import { motion } from 'framer-motion';
import { useRef } from 'react';

const logos = [
  {
    name: 'Shopify',
    url: 'https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/shopify-logo-png-transparent.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9zaG9waWZ5LWxvZ28tcG5nLXRyYW5zcGFyZW50LnBuZyIsImlhdCI6MTc2MzYwNDU5NSwiZXhwIjoxODU4MjEyNTk1fQ.If3B9D9Hfq0MY5KplYaMix-hCJBuLpV-sRNXA29XeL0',
    width: 140,
  },
  {
    name: 'Tiendanube',
    url: 'https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/tiendanube.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS90aWVuZGFudWJlLnN2ZyIsImlhdCI6MTc2MzYwNDYwNiwiZXhwIjoxNzk1MTQwNjA2fQ.6v4IubsGBfXCWvHCWsDLsEKNuCLbbyrdQR6gqQmr-LQ',
    width: 150,
  },
  {
    name: 'WooCommerce',
    url: 'https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/WooCommerce_logo.svg.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9Xb29Db21tZXJjZV9sb2dvLnN2Zy5wbmciLCJpYXQiOjE3NjM2MDQ2MTQsImV4cCI6MTc5NTE0MDYxNH0.Xcuh9aOvVbaJjMdZFClK0UxkreGtsQoRzLGGllJZu9o',
    width: 160,
  },
  {
    name: 'WhatsApp',
    url: 'https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/WhatsApp.svg.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9XaGF0c0FwcC5zdmcud2VicCIsImlhdCI6MTc2MzYwNDYyNSwiZXhwIjoxNzk1MTQwNjI1fQ.TO1p-lcKSPJeO-TICvMYB50HCQdwHfv7nft1ApZhtV8',
    width: 80,
  },
  {
    name: 'Meta',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Meta_Platforms_Inc._logo_%28cropped%29.svg/2560px-Meta_Platforms_Inc._logo_%28cropped%29.svg.png',
    width: 120,
  }
];

export const IntegrationLogos = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full py-20 overflow-hidden relative" ref={containerRef}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-transparent z-0 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-2">Integraciones Nativas</p>
          <h3 className="text-3xl font-bold text-slate-900">Conecta con tus herramientas favoritas</h3>
        </div>

        <div className="h-[300px] w-full relative flex items-center justify-center">
          {logos.map((logo, index) => (
            <motion.div
              key={logo.name}
              drag
              dragConstraints={containerRef}
              whileHover={{ scale: 1.1, cursor: 'grab' }}
              whileDrag={{ scale: 1.2, cursor: 'grabbing', zIndex: 50 }}
              initial={{ 
                opacity: 0, 
                y: 50,
                x: (index - 2) * 150 // Distribute initially
              }}
              animate={{ 
                opacity: 1, 
                y: [0, -10, 0], // Floating effect
                x: (index - 2) * 150
              }}
              transition={{ 
                opacity: { duration: 0.5, delay: index * 0.1 },
                y: { 
                  duration: 3 + Math.random(), 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: Math.random() * 2
                }
              }}
              className="absolute p-6 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center select-none backdrop-blur-sm bg-white/80"
              style={{ width: logo.width + 60, height: 120 }}
            >
              <img 
                src={logo.url} 
                alt={logo.name} 
                className="w-full h-full object-contain pointer-events-none"
              />
            </motion.div>
          ))}
        </div>
        
        <p className="text-center text-slate-400 text-sm mt-8">
          Arrastra los logos para jugar con ellos ✨
        </p>
      </div>
    </div>
  );
};

