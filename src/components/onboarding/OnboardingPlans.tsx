import { motion } from 'framer-motion';
import { Check, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingPlansProps {
    onNext: (planId: string) => void;
}

export default function OnboardingPlans({ onNext }: OnboardingPlansProps) {
    const plans = [
        {
            id: 'free',
            name: 'Gratis',
            price: '$0',
            period: '/mes',
            description: 'Para explorar el futuro',
            features: [
                '20 productos en catálogo',
                '100 mensajes IA / mes',
                'Panel de control básico',
                'Soporte por comunidad'
            ],
            popular: false
        },
        {
            id: 'starter',
            name: 'Starter',
            price: '$29',
            period: '/mes',
            description: 'Impulsa tu emprendimiento',
            features: [
                'Personalización de IA',
                '100 productos',
                '1,500 mensajes IA',
                'Analytics básicos',
                'Soporte por email'
            ],
            popular: false
        },
        {
            id: 'pro',
            name: 'Pro',
            price: '$49',
            period: '/mes',
            description: 'Escala sin límites',
            features: [
                'IA Avanzada Personalizable',
                '200 productos',
                '3,500 mensajes IA',
                'Integración Shopify',
                'Analytics avanzados',
                'Soporte prioritario'
            ],
            popular: true,
            glow: true
        },
        {
            id: 'business',
            name: 'Business',
            price: '$99',
            period: '/mes',
            description: 'Dominio total del mercado',
            features: [
                'IA Enterprise',
                '500 productos',
                '7,500 mensajes IA',
                'Integraciones Premium',
                'API Access',
                'Soporte dedicado 24/7'
            ],
            popular: false
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in w-full max-w-7xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">Elige tu Plan</h2>
                <p className="text-slate-400">Selecciona el plan que mejor se adapte a tu negocio</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                    <motion.div
                        key={plan.id}
                        whileHover={{ y: -5 }}
                        className={`relative p-6 rounded-3xl border flex flex-col ${plan.glow
                            ? 'bg-blue-900/10 border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.15)]'
                            : 'bg-white/[0.02] border-white/5'
                            } backdrop-blur-sm transition-all duration-300`}
                    >
                        {plan.glow && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg">
                                Recomendado
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-white">{plan.price}</span>
                                <span className="text-slate-500 text-sm">{plan.period}</span>
                            </div>
                            <p className="text-sm text-slate-400 mt-4 leading-relaxed">{plan.description}</p>
                        </div>

                        <ul className="space-y-3 mb-6 flex-grow">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm text-slate-400">
                                    <Check className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <Button
                            onClick={() => onNext(plan.id)}
                            className={`w-full rounded-xl font-bold py-6 transition-all ${plan.glow
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                        >
                            {plan.id === 'free' ? 'Comenzar Gratis' : 'Seleccionar Plan'}
                        </Button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
