import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface OnboardingQuestionnaireProps {
    onNext: (data: any) => void;
    onBack: () => void;
}

export default function OnboardingQuestionnaire({ onNext, onBack }: OnboardingQuestionnaireProps) {
    const [formData, setFormData] = useState({
        company_type: '',
        role: '',
        monthly_sales: ''
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        onNext(formData);
    };

    const isValid = formData.company_type && formData.role && formData.monthly_sales;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">Cuéntanos sobre tu negocio</h2>
                <p className="text-slate-400">Para personalizar tu experiencia con Wipsy</p>
            </div>

            <div className="space-y-6 max-w-md mx-auto">
                <div className="space-y-3">
                    <Label className="text-slate-300 text-sm font-medium ml-1">¿Qué tipo de empresa tienes?</Label>
                    <Select onValueChange={(val) => handleChange('company_type', val)} value={formData.company_type}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white focus:ring-blue-500/50 rounded-xl">
                            <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="ecommerce" className="focus:bg-white/10 focus:text-white">E-commerce / Tienda Online</SelectItem>
                            <SelectItem value="retail" className="focus:bg-white/10 focus:text-white">Retail / Tienda Física</SelectItem>
                            <SelectItem value="services" className="focus:bg-white/10 focus:text-white">Servicios Profesionales</SelectItem>
                            <SelectItem value="restaurant" className="focus:bg-white/10 focus:text-white">Restaurante / Comida</SelectItem>
                            <SelectItem value="other" className="focus:bg-white/10 focus:text-white">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-slate-300 text-sm font-medium ml-1">¿Cuál es tu rol?</Label>
                    <Select onValueChange={(val) => handleChange('role', val)} value={formData.role}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white focus:ring-blue-500/50 rounded-xl">
                            <SelectValue placeholder="Selecciona tu cargo" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="owner" className="focus:bg-white/10 focus:text-white">Dueño / Fundador</SelectItem>
                            <SelectItem value="manager" className="focus:bg-white/10 focus:text-white">Gerente / Administrador</SelectItem>
                            <SelectItem value="sales" className="focus:bg-white/10 focus:text-white">Ventas / Atención al Cliente</SelectItem>
                            <SelectItem value="marketing" className="focus:bg-white/10 focus:text-white">Marketing</SelectItem>
                            <SelectItem value="other" className="focus:bg-white/10 focus:text-white">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-slate-300 text-sm font-medium ml-1">¿Cuál es tu volumen de ventas mensual aproximado?</Label>
                    <Select onValueChange={(val) => handleChange('monthly_sales', val)} value={formData.monthly_sales}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white focus:ring-blue-500/50 rounded-xl">
                            <SelectValue placeholder="Selecciona un rango" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="0-1000" className="focus:bg-white/10 focus:text-white">Menos de $1,000 USD</SelectItem>
                            <SelectItem value="1000-5000" className="focus:bg-white/10 focus:text-white">$1,000 - $5,000 USD</SelectItem>
                            <SelectItem value="5000-20000" className="focus:bg-white/10 focus:text-white">$5,000 - $20,000 USD</SelectItem>
                            <SelectItem value="20000+" className="focus:bg-white/10 focus:text-white">Más de $20,000 USD</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex justify-between pt-8 max-w-md mx-auto">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-slate-400 hover:text-white hover:bg-white/5"
                >
                    Atrás
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!isValid}
                    className="bg-white text-black hover:bg-slate-200 rounded-full px-8 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continuar
                </Button>
            </div>
        </div>
    );
}
