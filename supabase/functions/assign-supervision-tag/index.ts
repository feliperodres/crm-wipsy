// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, userId, reason = 'solicitud de supervisión' } = await req.json();
    
    console.log('Assigning supervision tag to customer:', { customerId, userId, reason });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Asignar etiqueta "Supervisión Requerida" automáticamente
    const { error: tagError } = await supabase.rpc('assign_system_tag', {
      target_customer_id: customerId,
      tag_name_param: 'Supervisión Requerida',
      tag_color_param: '#ef4444', // Rojo para supervisión requerida
      target_user_id: userId
    });

    if (tagError) {
      console.error('Error assigning supervision tag:', tagError);
      throw tagError;
    }

    // Desactivar el agente IA para este cliente
    const { error: customerError } = await supabase
      .from('customers')
      .update({ ai_agent_enabled: false })
      .eq('id', customerId)
      .eq('user_id', userId);

    if (customerError) {
      console.error('Error disabling AI agent:', customerError);
      throw customerError;
    }

    console.log('Supervision tag assigned and AI agent disabled successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Etiqueta de supervisión asignada y agente IA desactivado'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in assign-supervision-tag:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error',
        details: 'Error al asignar etiqueta de supervisión'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});