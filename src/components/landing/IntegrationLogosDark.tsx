import { motion } from 'framer-motion';
import { useRef } from 'react';

const logos = [
    {
        name: 'Shopify',
        url: 'https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/shopify-logo-png-transparent.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9zaG9waWZ5LWxvZ28tcG5nLXRyYW5zcGFyZW50LnBuZyIsImlhdCI6MTc2MzYwNDU5NSwiZXhwIjoxODU4MjEyNTk1fQ.If3B9D9Hfq0MY5KplYaMix-hCJBuLpV-sRNXA29XeL0',
        width: 160, // Slightly larger
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
        width: 110,
    }
];

export const IntegrationLogosDark = () => {
    return (
        <div className="w-full pt-20 pb-8 overflow-hidden relative">
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-transparent z-0 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <p className="text-sm font-medium text-green-400 uppercase tracking-widest mb-2">Integraciones Nativas</p>
                    <h3 className="text-3xl font-bold text-white">Conecta con tus herramientas favoritas</h3>
                </div>

                {/* Marquee Container */}
                <div className="relative w-full overflow-hidden mask-linear-gradient">
                    <div className="flex w-max animate-marquee gap-12 items-center">
                        {[...logos, ...logos, ...logos].map((logo, index) => (
                            <div
                                key={`${logo.name}-${index}`}
                                className="flex items-center justify-center bg-white/5 border border-white/10 rounded-xl px-8 py-6 backdrop-blur-sm hover:bg-white/10 transition-colors"
                                style={{ minWidth: logo.width + 60, height: 100 }}
                            >
                                <img
                                    src={logo.url}
                                    alt={logo.name}
                                    className="w-full h-full object-contain opacity-90 hover:opacity-100 transition-opacity"
                                    style={{ maxWidth: logo.width }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
