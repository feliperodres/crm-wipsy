import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WhatsAppChatSimulation } from '@/components/demo/WhatsAppChatSimulation';
import { DemoQuestionnaire } from '@/components/demo/DemoQuestionnaire';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { motion } from 'framer-motion';
import { MessageCircle, Rocket, Check } from 'lucide-react';
import nuevoLogo from '@/assets/nuevo-logo.png';
import { TestimonialSlideshow } from '@/components/landing/TestimonialSlideshow';
import { FeaturesAndScreenshots } from '@/components/landing/FeaturesAndScreenshots';
import { IntegrationLogosDark } from '@/components/landing/IntegrationLogosDark';

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const calculateTimeLeft = () => {
            // Reference timestamp (January 1, 2025, 00:00:00 UTC)
            const referenceDate = new Date('2025-01-01T00:00:00Z').getTime();
            const now = Date.now();
            
            // Calculate elapsed time since reference in milliseconds
            const elapsed = now - referenceDate;
            
            // 24 hours in milliseconds (cycle duration)
            const cycleDuration = 24 * 60 * 60 * 1000;
            
            // Find position within current 24-hour cycle (0 to cycleDuration)
            const positionInCycle = elapsed % cycleDuration;
            
            // Calculate remaining time: starts at 48h, ends at 24h
            // When positionInCycle is 0 (start of cycle) -> 48h remaining
            // When positionInCycle is cycleDuration (end of cycle) -> 24h remaining
            const maxSeconds = 48 * 60 * 60; // 48 hours in seconds
            const minSeconds = 24 * 60 * 60; // 24 hours in seconds
            const rangeSeconds = maxSeconds - minSeconds; // 24 hours range
            
            // Calculate seconds left (from 48h to 24h over 24-hour cycle)
            const secondsLeft = maxSeconds - Math.floor((positionInCycle / cycleDuration) * rangeSeconds);
            
            return secondsLeft;
        };

        // Initialize
        setTimeLeft(calculateTimeLeft());

        // Update every second
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-8 animate-fade-in w-full px-4">
            <div className="flex items-center gap-2 text-white font-bold tracking-wider text-xs md:text-base uppercase text-center">
                <span className="text-xl md:text-2xl">⏳</span>
                SOLO POR 48 HORAS PRUEBALO GRATIS
            </div>
            <div className="text-4xl sm:text-5xl md:text-7xl font-mono font-bold text-white tracking-widest tabular-nums text-center">
                {formatTime(timeLeft)}
            </div>
        </div>
    );
};

export default function Landing2() {
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);

    const handleWhatsAppClick = () => {
        setShowQuestionnaire(true);
    };

    if (showQuestionnaire) {
        return <DemoQuestionnaire />;
    }

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans selection:bg-green-500/30 relative">
            <ParticleBackground />

            {/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-green-600/10 blur-[120px] rounded-full opacity-20 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-black via-green-900/5 to-transparent" />
            </div>

            {/* Navigation (Simplified) */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-black/50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={nuevoLogo} alt="Wipsy" className="h-8 w-auto" />
                        <span className="text-white/50 font-light text-lg">x</span>
                        <img
                            src="https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/ChatGPT%20Image%2026%20nov%202025,%2002_47_03%20p.m..png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9DaGF0R1BUIEltYWdlIDI2IG5vdiAyMDI1LCAwMl80N18wMyBwLm0uLnBuZyIsImlhdCI6MTc2NDE4NjQ5MSwiZXhwIjoxNzk1NzIyNDkxfQ.JPhi4ud7wGgg6w4wDVbIUtJnKwKz8g9IcX5sY5QlORU"
                            alt="Partner"
                            className="h-8 w-auto"
                        />
                    </div>
                    <Button
                        onClick={handleWhatsAppClick}
                        className="bg-green-500 hover:bg-green-600 text-black font-bold rounded-full"
                    >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Agendar Reunión
                    </Button>
                </div>
            </nav>

            <div className="relative z-10 pt-24 pb-12 px-4 min-h-screen flex flex-col items-center justify-center">

                {/* Countdown Section */}
                <CountdownTimer />

                <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-24 items-center mt-8 md:mt-16">

                    {/* Left Column: Phone Mockup (Replacing Laptop/Rocket) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative flex justify-center"
                    >
                        <div className="relative">
                            {/* Glow effect */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[500px] bg-green-500/20 blur-[80px] rounded-full animate-pulse" />
                            <WhatsAppChatSimulation />

                            {/* Floating Elements mimicking the rocket/money vibe but cleaner */}
                            <motion.div
                                animate={{ y: [0, -20, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-10 -right-10 bg-black/80 border border-green-500/30 p-4 rounded-2xl backdrop-blur-xl shadow-2xl hidden md:block"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/20 rounded-full">
                                        <Rocket className="h-6 w-6 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Ventas Automáticas</p>
                                        <p className="text-lg font-bold text-white">+320%</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Right Column: Text & CTA */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        className="text-center lg:text-left space-y-8"
                    >
                        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                            DUPLICA TUS VENTAS <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                                EN WHATSAPP CON IA
                            </span>
                        </h1>

                        <p className="text-xl text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            Convierte WhatsApp en tu mejor vendedor. Nuestra IA responde, asesora y cierra ventas automáticamente, sincronizada con tu catálogo e inventario.
                            <br />
                            <span className="text-green-400 font-medium mt-2 block">
                                Tu agente de IA venderá por ti 24/7.
                            </span>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <Button
                                size="lg"
                                onClick={handleWhatsAppClick}
                                className="h-16 px-8 text-xl font-bold rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-[0_0_30px_rgba(37,211,102,0.3)] hover:shadow-[0_0_50px_rgba(37,211,102,0.5)] transition-all hover:scale-105 animate-shake"
                            >
                                <MessageCircle className="mr-3 h-6 w-6" />
                                Agendar Reunión
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/10">
                            {['Respuestas Instantáneas', 'Pedidos Automáticos', 'Catálogo Sincronizado', 'Soporte 24/7'].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </div>

                {/* Testimonial Slideshow Section */}
                <TestimonialSlideshow />

                {/* Integrations Section */}
                <IntegrationLogosDark />

                {/* Features and Screenshots Section */}
                <FeaturesAndScreenshots />

            </div>
        </div>
    );
}
