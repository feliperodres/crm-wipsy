import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { name, category, language, components, credentialId, phoneNumberId } = body;
    
    console.log('Received request to create template:', { name, category, language, componentsCount: components?.length, credentialId, phoneNumberId });

    // Validate required fields
    if (!name || !category || !language || !components) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Resolve Meta credentials - always fetch as array for safety
    let credentials: any = null;

    if (credentialId) {
      console.log('Fetching credential by ID:', credentialId);
      const { data, error } = await supabase
        .from('whatsapp_meta_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', credentialId)
        .limit(1);
      if (error) {
        console.error('Error fetching credential by id:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch Meta credentials', details: error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      credentials = data?.[0] || null;
    } else if (phoneNumberId) {
      console.log('Fetching credential by phone_number_id:', phoneNumberId);
      const { data, error } = await supabase
        .from('whatsapp_meta_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number_id', phoneNumberId)
        .limit(1);
      if (error) {
        console.error('Error fetching credential by phone_number_id:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch Meta credentials', details: error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      credentials = data?.[0] || null;
    } else {
      console.log('No credentialId or phoneNumberId provided, fetching default or first credential');
      // Try default first
      const { data: defaultList } = await supabase
        .from('whatsapp_meta_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .limit(1);
      
      if (defaultList && defaultList.length > 0) {
        credentials = defaultList[0];
        console.log('Found default credential:', credentials.id);
      } else {
        // Get first credential
        const { data: firstList, error: listError } = await supabase
          .from('whatsapp_meta_credentials')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);
        if (listError) {
          console.error('Error listing credentials:', listError);
          return new Response(JSON.stringify({ error: 'Failed to fetch Meta credentials', details: listError }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        credentials = firstList?.[0] || null;
        if (credentials) {
          console.log('Found first credential:', credentials.id);
        }
      }
    }

    if (!credentials) {
      console.error('No Meta credentials found for user:', user.id);
      return new Response(JSON.stringify({ error: 'No tienes credenciales de WhatsApp configuradas. Por favor, conecta tu cuenta de WhatsApp Business en la página de Configuración.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Creating template:', name, 'for WABA:', credentials.waba_id);

    // Create template in Meta
    const metaUrl = `https://graph.facebook.com/v22.0/${credentials.waba_id}/message_templates`;
    const metaPayload = {
      name: name,
      category: category,
      language: language,
      components: components
    };

    console.log('Meta API payload:', JSON.stringify(metaPayload, null, 2));

    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaPayload)
    });

    const metaData = await metaResponse.json();
    console.log('Meta API response status:', metaResponse.status);
    console.log('Meta API response data:', JSON.stringify(metaData, null, 2));

    if (!metaResponse.ok) {
      console.error('Meta API error:', metaData);
      return new Response(JSON.stringify({ 
        error: 'Failed to create template in Meta', 
        details: metaData 
      }), {
        status: metaResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Template created in Meta successfully, saving to database...');

    // Save template to local database
    const { data: template, error: dbError } = await supabase
      .from('whatsapp_templates')
      .insert({
        user_id: user.id,
        waba_id: credentials.waba_id,
        template_id: metaData.id,
        name: name,
        category: category,
        language: language,
        status: metaData.status || 'PENDING',
        components: components
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving template to database:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save template locally', details: dbError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Template saved successfully:', template.id);

    return new Response(JSON.stringify({ 
      success: true, 
      template: template,
      metaResponse: metaData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in meta-templates-create:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
