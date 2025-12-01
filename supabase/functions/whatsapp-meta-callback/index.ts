import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contiene user_id
    
    console.log('Meta callback received:', { code: code?.substring(0, 10), state });
    
    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    const appId = Deno.env.get('META_APP_ID');
    const appSecret = Deno.env.get('META_APP_SECRET');
    
    if (!appId || !appSecret) {
      throw new Error('META_APP_ID or META_APP_SECRET not configured');
    }

    // Intercambiar código por access token
    console.log('Exchanging code for access token...');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-meta-callback`;
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`
    );
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${errorData}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error('No access token received');
    }

    console.log('Access token received, fetching WABA info...');
    
    // Obtener información del WABA usando el access token
    const debugResponse = await fetch(
      `https://graph.facebook.com/v18.0/debug_token?` +
      `input_token=${accessToken}&` +
      `access_token=${appId}|${appSecret}`
    );
    
    const debugData = await debugResponse.json();
    console.log('Debug token response:', JSON.stringify(debugData, null, 2));
    
    // Obtener el WABA ID de los permisos - buscar en whatsapp_business_management
    const granularScopes = debugData.data?.granular_scopes || [];
    const wabaScope = granularScopes.find((scope: any) => 
      scope.scope === 'whatsapp_business_management' && scope.target_ids?.length > 0
    );
    const wabaId = wabaScope?.target_ids?.[0];
    
    if (!wabaId) {
      console.error('No WABA ID found in token data');
      throw new Error('No WhatsApp Business Account found');
    }

    console.log('WABA ID:', wabaId);
    console.log('Fetching phone numbers...');
    
    // Obtener phone numbers asociados al WABA
    const phonesResponse = await fetch(
      `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!phonesResponse.ok) {
      const errorData = await phonesResponse.text();
      console.error('Failed to fetch phone numbers:', errorData);
      throw new Error(`Failed to fetch phone numbers: ${errorData}`);
    }
    
    const phonesData = await phonesResponse.json();
    console.log('Phone numbers response:', JSON.stringify(phonesData, null, 2));
    
    if (!phonesData.data || phonesData.data.length === 0) {
      throw new Error('No phone numbers found for this WhatsApp Business Account');
    }
    
    const phoneNumber = phonesData.data[0];

    // Guardar en base de datos
    console.log('Saving credentials to database...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const verifyToken = crypto.randomUUID();
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-meta-webhook`;

    // Intentar actualizar si existe, sino crear nuevo
    const { data, error } = await supabase
      .from('whatsapp_meta_credentials')
      .upsert({
        user_id: state,
        phone_number_id: phoneNumber.id,
        waba_id: wabaId,
        access_token: accessToken,
        phone_number: phoneNumber.display_phone_number,
        business_name: phoneNumber.verified_name || 'WhatsApp Business',
        verify_token: verifyToken,
        webhook_url: webhookUrl,
        status: 'active',
        is_default: true
      }, {
        onConflict: 'user_id,phone_number_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Credentials saved successfully:', data.id);

    // Activar agente Wipsy v2 automáticamente para números de Meta
    console.log('Activating Wipsy v2 agent for user:', state);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        use_webhook_v2: true,
        webhook_v2_url: 'https://n8n-n8n.uefo06.easypanel.host/webhook/217d8f2a-462b-483c-94f9-a7e1f5857acb',
        message_buffer_v2_seconds: 10
      })
      .eq('user_id', state);

    if (profileError) {
      console.error('Error activating v2 agent:', profileError);
      // No lanzar error, solo loguearlo para no bloquear la conexión
    } else {
      console.log('Wipsy v2 agent activated successfully for user:', state);
    }

    // Crear cliente admin para verificar el estado del onboarding
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar si el usuario está en proceso de onboarding
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', state)
      .single();

    console.log('Profile onboarding status:', profileData?.onboarding_completed);

    // Determinar la página de redirección según el estado del onboarding
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080';
    const targetPage = profileData?.onboarding_completed === false ? '/onboarding' : '/whatsapp';
    
    // Redirigir de vuelta a la app con los parámetros de éxito
    const redirectUrl = `${appUrl}${targetPage}?success=true&phone=${encodeURIComponent(phoneNumber.display_phone_number)}`;
    
    console.log('Redirecting to:', redirectUrl);
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });

  } catch (error) {
    console.error('Error in Meta callback:', error);
    
    // Intentar obtener el estado del onboarding para redirigir correctamente incluso en error
    let targetPage = '/whatsapp';
    try {
      const state = new URL(req.url).searchParams.get('state');
      if (state) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', state)
          .single();
        
        if (profileData?.onboarding_completed === false) {
          targetPage = '/onboarding';
        }
      }
    } catch (e) {
      console.error('Error checking onboarding status on error:', e);
    }
    
    // Redirigir con error
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080';
    const redirectUrl = `${appUrl}${targetPage}?error=${encodeURIComponent(error.message)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });
  }
});
