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

    // Parse body safely
    let sync = false;
    let credentialId: string | undefined = undefined;
    let phoneNumberId: string | undefined = undefined;
    try {
      const body = await req.json();
      sync = body.sync || false;
      credentialId = body.credentialId;
      phoneNumberId = body.phoneNumberId;
    } catch (e) {
      console.log('No/invalid JSON, using defaults');
    }

    // Resolve Meta credentials - always fetch as array for safety
    let credentials: any = null;

    if (credentialId) {
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
      // Try default first
      const { data: defaultList } = await supabase
        .from('whatsapp_meta_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .limit(1);
      
      if (defaultList && defaultList.length > 0) {
        credentials = defaultList[0];
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
      }
    }

    if (!credentials) {
      return new Response(JSON.stringify({ error: 'No Meta credentials found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If sync is requested, fetch from Meta API
    if (sync) {
      console.log('Syncing templates from Meta API for WABA:', credentials.waba_id);
      
      const metaUrl = `https://graph.facebook.com/v22.0/${credentials.waba_id}/message_templates`;
      const metaResponse = await fetch(metaUrl, {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!metaResponse.ok) {
        const errorData = await metaResponse.json();
        console.error('Meta API error:', errorData);
        return new Response(JSON.stringify({ error: 'Failed to fetch templates from Meta', details: errorData }), {
          status: metaResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const metaData = await metaResponse.json();
      const templates = metaData.data || [];

      console.log(`Found ${templates.length} templates from Meta`);

      // Sync templates to database
      for (const template of templates) {
        const { error: upsertError } = await supabase
          .from('whatsapp_templates')
          .upsert({
            user_id: user.id,
            waba_id: credentials.waba_id,
            template_id: template.id,
            name: template.name,
            category: template.category,
            language: template.language,
            status: template.status,
            components: template.components || [],
            rejection_reason: template.rejected_reason || null
          }, {
            onConflict: 'user_id,name,language'
          });

        if (upsertError) {
          console.error('Error upserting template:', template.name, upsertError);
        }
      }
    }

    // Fetch templates from local database (filter by selected WABA)
    const { data: localTemplates, error: fetchError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('waba_id', credentials.waba_id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching local templates:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch templates' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ templates: localTemplates || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in meta-templates-list:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
