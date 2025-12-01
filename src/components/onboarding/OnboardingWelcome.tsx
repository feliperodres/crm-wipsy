import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageCircle, Bot } from 'lucide-react';
import nuevoLogo from '@/assets/nuevo-logo.png';

interface OnboardingWelcomeProps {
    onNext: () => void;
}

export default function OnboardingWelcome({ onNext }: OnboardingWelcomeProps) {
    const handleDemoClick = () => {
        window.open('https://wa.me/525526686750', '_blank');
    };

    return (
        <div className="space-y-8 text-center animate-fade-in">
            <div className="flex justify-center mb-8 relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full opacity-50" />
                <img
                    src={nuevoLogo}
                    alt="Wipsy Logo"
                    className="h-28 w-auto object-contain relative z-10 drop-shadow-2xl"
                />
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                    Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Wipsy</span>
                </h2>
                <p className="text-slate-400 text-lg md:text-xl leading-relaxed">
                    Crea tu primer agente de ventas inteligente que venderá por ti 24/7.
                    <br />
                    <span className="text-sm text-slate-500 mt-2 block">Configuración rápida en 5 minutos</span>
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-12 max-w-3xl mx-auto">
                <div
                    onClick={onNext}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                            <Bot className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Crear mi Agente</h3>
                            <p className="text-slate-400 text-sm">Crear mi agente que venda por mi 24/7</p>
                        </div>
                        <Button className="w-full bg-white text-black hover:bg-slate-200 font-semibold rounded-full mt-4">
                            Comenzar
                        </Button>
                    </div>
                </div>

                <div
                    onClick={handleDemoClick}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
                >
                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors duration-300">
                            <MessageCircle className="h-8 w-8 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Probar Demo</h3>
                            <p className="text-slate-400 text-sm">Interactúa con un agente real en WhatsApp</p>
                        </div>
                        <Button className="w-full bg-white text-black hover:bg-slate-200 font-semibold rounded-full mt-4">
                            Chatear con Demo
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
