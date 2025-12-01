import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingProductsProps {
    onNext: () => void;
    onSkip: () => void;
    onBack: () => void;
}

const VIDEO_URL = 'https://www.youtube.com/embed/HFeytMPc_8k';

export default function OnboardingProducts({ onNext, onSkip, onBack }: OnboardingProductsProps) {
    const { user } = useAuth();
    const [selectedOption, setSelectedOption] = useState<'shopify' | 'own' | null>(null);
    const [shopDomain, setShopDomain] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'validating' | 'syncing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleConnectShopify = async () => {
        if (!shopDomain || !accessToken) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        setSyncStatus('validating');
        setErrorMessage('');

        try {
            // 1. Validar credenciales
            const { data: validateData, error: validateError } = await supabase.functions.invoke(
                'validate-shopify-credentials',
                { body: { shopDomain: shopDomain.trim(), accessToken: accessToken.trim() } }
            );

            if (validateError || !validateData?.success) {
                throw new Error(validateData?.error || 'Credenciales inválidas');
            }

            // 2. Sincronizar productos
            setSyncStatus('syncing');
            toast.info('Importando productos...');

            const { error: productsError } = await supabase.functions.invoke(
                'shopify-import-products',
                { body: { shopDomain: shopDomain.trim(), accessToken: accessToken.trim(), userId: user?.id } }
            );

            if (productsError) {
                console.error('Error importing products:', productsError);
                // No bloqueamos por error de productos, continuamos
            }

            // 3. Sincronizar órdenes
            const { error: ordersError } = await supabase.functions.invoke(
                'shopify-import-orders',
                { body: { shopDomain: shopDomain.trim(), accessToken: accessToken.trim(), userId: user?.id, daysBack: 30 } }
            );

            if (ordersError) {
                console.error('Error importing orders:', ordersError);
                // No bloqueamos por error de órdenes, continuamos
            }

            // 4. Configurar webhooks
            const { error: webhookError } = await supabase.functions.invoke(
                'shopify-setup-webhook',
                { body: { shopDomain: shopDomain.trim(), accessToken: accessToken.trim() } }
            );

            if (webhookError) {
                console.error('Error setting up webhooks:', webhookError);
                // No bloqueamos por error de webhooks, continuamos
            }

            setSyncStatus('success');
            toast.success('¡Shopify conectado y sincronizado exitosamente!');

            setTimeout(() => {
                onNext();
            }, 1500);

        } catch (error: any) {
            console.error('Error connecting Shopify:', error);
            setSyncStatus('error');
            setErrorMessage(error.message || 'Error al conectar con Shopify');
            toast.error(error.message || 'Error al conectar con Shopify');
        } finally {
            setLoading(false);
        }
    };

    const handleUseOwnStore = () => {
        toast.success('Podrás agregar productos manualmente en el siguiente paso');
        onNext();
    };

    if (!selectedOption) {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2">Conecta tu tienda</h2>
                    <p className="text-slate-400">Elige cómo quieres gestionar tus productos</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
                    <div
                        onClick={() => setSelectedOption('shopify')}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-green-500/50"
                    >
                        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-[#95BF47]/20 flex items-center justify-center border border-[#95BF47]/30 group-hover:scale-110 transition-transform duration-300">
                                <Store className="h-8 w-8 text-[#95BF47]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Shopify</h3>
                                <p className="text-slate-400 text-sm">Conecta tu tienda de Shopify automáticamente</p>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={handleUseOwnStore}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-blue-500/50"
                    >
                        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                                <Store className="h-8 w-8 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Otra Plataforma</h3>
                                <p className="text-slate-400 text-sm">Sube tus productos manualmente o vía Excel</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <Button
                        variant="ghost"
                        onClick={onSkip}
                        className="text-slate-400 hover:text-white hover:bg-white/5"
                    >
                        Omitir este paso
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-[#95BF47]/10 rounded-full ring-1 ring-[#95BF47]/20">
                        <Store className="h-12 w-12 text-[#95BF47]" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-white">Conectar Shopify</h2>
                <p className="text-slate-400">Ingresa los datos de tu tienda para sincronizar productos</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
                <div className="space-y-2">
                    <Label className="text-slate-300">Dominio de la tienda (ej: mi-tienda.myshopify.com)</Label>
                    <Input
                        value={shopDomain}
                        onChange={(e) => setShopDomain(e.target.value)}
                        placeholder="tu-tienda.myshopify.com"
                        className="bg-white/5 border-white/10 text-white focus:ring-[#95BF47]/50"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-300">Access Token (Admin API)</Label>
                    <Input
                        type="password"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        placeholder="shpat_..."
                        className="bg-white/5 border-white/10 text-white focus:ring-[#95BF47]/50"
                    />
                </div>

                {errorMessage && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-sm">{errorMessage}</p>
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedOption(null)}
                        className="flex-1 text-slate-400 hover:text-white hover:bg-white/5"
                    >
                        Atrás
                    </Button>
                    <Button
                        onClick={handleConnectShopify}
                        disabled={loading}
                        className="flex-1 bg-[#95BF47] hover:bg-[#85AB3E] text-white font-bold"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {syncStatus === 'validating' ? 'Validando...' : 'Sincronizando...'}
                            </>
                        ) : (
                            'Conectar Tienda'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
