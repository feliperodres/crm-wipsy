import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, Smartphone } from 'lucide-react';

interface OnboardingWhatsAppTypeProps {
    onNext: (type: 'normal' | 'business') => void;
    onBack: () => void;
}

export default function OnboardingWhatsAppType({ onNext, onBack }: OnboardingWhatsAppTypeProps) {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">¿Qué tipo de WhatsApp usas en tu negocio?</h2>
                <p className="text-slate-400">Necesitamos saber esto para guiarte en la conexión</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
                <div
                    onClick={() => onNext('normal')}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-blue-500/50"
                >
                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors duration-300">
                            <Smartphone className="h-8 w-8 text-slate-300 group-hover:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">WhatsApp Personal</h3>
                            <p className="text-slate-400 text-sm">La app normal de WhatsApp</p>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => onNext('business')}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-green-500/50"
                >
                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors duration-300">
                            <MessageSquare className="h-8 w-8 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">WhatsApp Business</h3>
                            <p className="text-slate-400 text-sm">La versión para negocios (Icono B)</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-start pt-8 max-w-3xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-slate-400 hover:text-white hover:bg-white/5"
                >
                    Atrás
                </Button>
            </div>
        </div>
    );
}
