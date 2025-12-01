import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, User, ArrowLeft, Check } from 'lucide-react';
import nuevoLogo from '@/assets/nuevo-logo.png';
import { useNavigate } from 'react-router-dom';
import { trackCompleteRegistration } from '@/utils/metaPixel';
import { trackCompleteRegistration as trackTikTokRegistration, identifyUser } from '@/utils/tiktokPixel';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { motion } from 'framer-motion';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('57');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) navigate('/dashboard');
    });
    return () => { active = false; };
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await identifyUser({
          email: email.trim(),
          externalId: session.user.id
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      let errorMessage = "Error al iniciar sesión";
      if (error.message?.includes('Invalid login credentials')) errorMessage = "Credenciales inválidas";
      else if (error.message?.includes('Email not confirmed')) errorMessage = "Por favor confirma tu email antes de iniciar sesión";
      else if (error.message?.includes('rate limit')) errorMessage = "Demasiados intentos. Espera un momento e intenta de nuevo";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      toast({ title: "Error", description: "Por favor ingresa un número de teléfono válido", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/onboarding`;
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { business_name: businessName.trim(), phone: phoneNumber.trim() }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: data.user.id,
          business_name: businessName.trim(),
          phone: phoneNumber.trim(),
          country_code: `+${countryCode}`,
          onboarding_completed: false,
          onboarding_current_step: 0
        });
        if (profileError) console.error('Error creating profile:', profileError);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const selectedPlan = localStorage.getItem('selectedPlan');
        trackCompleteRegistration(selectedPlan || undefined, 'email');
        const planValues: Record<string, number> = { 'starter': 9, 'pro': 49, 'business': 99 };
        const planValue = selectedPlan ? planValues[selectedPlan] : undefined;
        
        trackTikTokRegistration('email', { contentId: selectedPlan || undefined, value: planValue });
        await identifyUser({ email: email.trim(), phoneNumber: phoneNumber, externalId: session.user.id });
        
        toast({ title: "¡Cuenta creada!", description: "Configuremos tu cuenta..." });
        navigate('/onboarding');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      let errorMessage = "Error al crear la cuenta";
      if (error.message?.includes('User already registered')) errorMessage = "Ya existe una cuenta con este email";
      else if (error.message?.includes('Password')) errorMessage = "La contraseña no cumple con los requisitos";
      
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <ParticleBackground />
      
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full opacity-40 animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full opacity-40 animate-pulse" />
      </div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Volver al inicio</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-6">
              <img 
                src={nuevoLogo} 
                alt="Logo" 
                className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              />
            </div>
            <p className="text-gray-400 text-sm">
              Bienvenido al futuro del comercio conversacional
            </p>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 mb-6 border border-white/5">
                <TabsTrigger 
                  value="signin"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400"
                >
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400"
                >
                  Registrarse
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-300">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-gray-300">Contraseña</Label>
                      <a href="#" className="text-xs text-blue-400 hover:text-blue-300">¿Olvidaste tu contraseña?</a>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? "Iniciando..." : "Acceder al Dashboard"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-name" className="text-gray-300">Nombre del Negocio</Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="business-name"
                        type="text"
                        placeholder="Mi Tienda"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone-number" className="text-gray-300">WhatsApp</Label>
                    <div className="[&_.react-tel-input_.form-control]:!w-full [&_.react-tel-input_.form-control]:!h-10 [&_.react-tel-input_.form-control]:!bg-white/5 [&_.react-tel-input_.form-control]:!border-white/10 [&_.react-tel-input_.form-control]:!text-white [&_.react-tel-input_.flag-dropdown]:!bg-white/5 [&_.react-tel-input_.flag-dropdown]:!border-white/10 [&_.react-tel-input_.selected-flag]:!bg-transparent [&_.react-tel-input_.country-list]:!bg-[#1f2c34] [&_.react-tel-input_.country-list]:!text-white [&_.react-tel-input_.country-list_.country:hover]:!bg-white/10 [&_.react-tel-input_.country-list_.country.highlight]:!bg-white/10">
                      <PhoneInput
                        country={'co'}
                        value={phoneNumber}
                        onChange={(phone, country: any) => {
                          setPhoneNumber(phone);
                          setCountryCode(country.dialCode);
                        }}
                        inputProps={{
                          name: 'phone',
                          required: true,
                          className: 'flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-12'
                        }}
                        enableSearch
                        searchPlaceholder="Buscar país..."
                        preferredCountries={['co', 'mx', 'es', 'ar', 've', 'cl', 'pe']}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-gray-300">Contraseña</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-gray-300">Confirmar</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-start gap-2 text-sm text-gray-400">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <p>Prueba gratuita de 14 días. Sin tarjeta de crédito.</p>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all duration-300"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creando..." : "Comenzar Gratis"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-8 text-xs text-gray-600">
          © 2025 Wipsy AI. Protected by reCAPTCHA and subject to the Privacy Policy and Terms of Service.
        </div>
      </motion.div>
    </div>
  );
}
