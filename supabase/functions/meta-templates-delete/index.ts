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
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { templateId, name, credentialId, phoneNumberId } = await req.json();

    if (!templateId) {
      return new Response(JSON.stringify({ error: 'Template ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get template from database
    const { data: template, error: fetchError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Resolve Meta credentials
    let credentials: any = null;

    if (credentialId) {
      const { data, error } = await supabase
        .from('whatsapp_meta_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', credentialId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching credential by id:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch Meta credentials' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      credentials = data;
    } else if (phoneNumberId) {
      const { data, error } = await supabase
        .from('whatsapp_meta_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number_id', phoneNumberId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching credential by phone_number_id:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch Meta credentials' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      credentials = data;
    } else {
      const { data: byDefault } = await supabase
        .from('whatsapp_meta_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('waba_id', template.waba_id)
        .maybeSingle();
      if (byDefault) credentials = byDefault;
      if (!credentials) {
        const { data: fallbackDefault } = await supabase
          .from('whatsapp_meta_credentials')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle();
        if (fallbackDefault) credentials = fallbackDefault;
      }
      if (!credentials) {
        const { data: firstList } = await supabase
          .from('whatsapp_meta_credentials')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);
        credentials = firstList?.[0] || null;
      }
    }

    if (!credentials) {
      return new Response(JSON.stringify({ error: 'No Meta credentials found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Deleting template from Meta:', name || template.name);

    // Delete template from Meta
    const metaUrl = `https://graph.facebook.com/v22.0/${credentials.waba_id}/message_templates?name=${name || template.name}`;
    const metaResponse = await fetch(metaUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!metaResponse.ok) {
      const errorData = await metaResponse.json();
      console.error('Meta API error:', errorData);
      // Continue to delete locally even if Meta deletion fails
    } else {
      console.log('Template deleted from Meta successfully');
    }

    // Delete template from local database
    const { error: deleteError } = await supabase
      .from('whatsapp_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting template from database:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete template locally' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Template deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in meta-templates-delete:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
