import { motion } from 'framer-motion';
import { Bot, MessageCircle, ShoppingCart, Store, Check } from 'lucide-react';

const features = [
    {
        icon: Bot,
        title: "AI Agent Inteligente",
        description: "Tu empleado estrella que nunca duerme. Responde al instante, cierra ventas y fideliza clientes 24/7.",
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/20"
    },
    {
        icon: MessageCircle,
        title: "WhatsApp Powerhouse",
        description: "Transforma WhatsApp en una máquina de ventas. Automatización, plantillas y gestión masiva sin esfuerzo.",
        color: "text-green-300",
        bg: "bg-green-400/10",
        border: "border-green-400/20"
    },
    {
        icon: ShoppingCart,
        title: "Pedidos Automáticos",
        description: "Desde 'hola' hasta 'pago confirmado' sin intervención humana. El sistema gestiona todo el flujo.",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20"
    },
    {
        icon: Store,
        title: "E-commerce Integrado",
        description: "Tu catálogo web sincronizado perfectamente con WhatsApp. Una experiencia de compra fluida y moderna.",
        color: "text-teal-400",
        bg: "bg-teal-500/10",
        border: "border-teal-500/20"
    }
];

export const FeaturesAndScreenshots = () => {
    return (
        <div className="w-full pt-8 pb-24 relative z-10">
            <div className="max-w-7xl mx-auto px-4">

                {/* Features Section */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Potencia sin límites</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">Todo lo que necesitas para escalar tu comercio conversacional.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300"
                        >
                            <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                <feature.icon className={`h-6 w-6 ${feature.color}`} />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Screenshots Section */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Control Total</h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Monitorea cada conversación, venta y métrica en tiempo real desde nuestro dashboard futurista.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Dashboard Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                            <img
                                src="https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/dashboard.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9kYXNoYm9hcmQucG5nIiwiaWF0IjoxNzYzNjA4MjE5LCJleHAiOjE3OTUxNDQyMTl9.1--EuMkaXUeILTQdkGlaQZtW9r-G9MpQMZRVxaE99eI"
                                alt="Dashboard de Wipsy"
                                className="w-full h-auto object-cover"
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <h3 className="font-semibold text-lg mb-2 text-white">Panel de Control</h3>
                            <p className="text-sm text-slate-400">Vista completa de métricas y estadísticas</p>
                        </div>
                    </motion.div>

                    {/* Chats Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                            <img
                                src="https://fczgowziugcvrpgfelks.supabase.co/storage/v1/object/sign/imagenes_wipsy/chats.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kYjg4ZDEzMC02NGJhLTQ0MmItYWYzNi1kOTAzOWM4YTRjNjMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc193aXBzeS9jaGF0cy5wbmciLCJpYXQiOjE3NjM2MDgyMzEsImV4cCI6MTc5NTE0NDIzMX0.766eJfTLocGSOe8moAB4mqdwDchXy6e_coZ_0JS2f7w"
                                alt="Chats de Wipsy"
                                className="w-full h-auto object-cover"
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <h3 className="font-semibold text-lg mb-2 text-white">Gestión de Chats</h3>
                            <p className="text-sm text-slate-400">Interfaz intuitiva para conversaciones</p>
                        </div>
                    </motion.div>
                </div>

                {/* Features List */}
                <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        "Analíticas de conversión en tiempo real",
                        "Gestión de inventario centralizada",
                        "Historial completo de chats",
                        "Reportes automáticos de ROI"
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-green-400" />
                            </div>
                            <span className="text-sm text-gray-300">{item}</span>
                        </motion.div>
                    ))}
                </div>

            </div>
        </div>
    );
};
