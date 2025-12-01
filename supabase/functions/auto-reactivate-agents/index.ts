import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting auto-reactivation process...');

    // Get all users with their auto-reactivation settings
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, auto_reactivation_hours')
      .not('auto_reactivation_hours', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles with auto-reactivation settings found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No profiles to process',
        reactivated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${profiles.length} profiles with auto-reactivation settings`);

    let totalReactivated = 0;

    // Process each user's customers
    for (const profile of profiles) {
      const reactivationHours = profile.auto_reactivation_hours || 24;
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - reactivationHours);

      console.log(`Processing user ${profile.user_id} with ${reactivationHours}h reactivation time`);

      // For Meta API (has whatsapp_chat_id): find chats with ai_agent_enabled=false
      const { data: metaChatsToReactivate, error: metaChatsError } = await supabase
        .from('chats')
        .select('id, customer_id, updated_at, whatsapp_chat_id')
        .eq('user_id', profile.user_id)
        .eq('ai_agent_enabled', false)
        .not('whatsapp_chat_id', 'is', null)
        .lt('updated_at', cutoffTime.toISOString());

      if (metaChatsError) {
        console.error(`Error fetching Meta chats for user ${profile.user_id}:`, metaChatsError);
      } else if (metaChatsToReactivate && metaChatsToReactivate.length > 0) {
        console.log(`Found ${metaChatsToReactivate.length} Meta chats to reactivate for user ${profile.user_id}`);
        
        // Reactivate Meta chats (update chats table)
        for (const chat of metaChatsToReactivate) {
          const { error: updateError } = await supabase
            .from('chats')
            .update({ 
              ai_agent_enabled: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', chat.id);

          if (updateError) {
            console.error(`Error reactivating Meta chat ${chat.id}:`, updateError);
            continue;
          }

          console.log(`Reactivated AI agent for Meta chat: ${chat.id}`);
          totalReactivated++;
        }
      }

      // For Evolution API (no whatsapp_chat_id): find customers with ai_agent_enabled=false
      const { data: customersToReactivate, error: customersError } = await supabase
        .from('customers')
        .select('id, updated_at')
        .eq('user_id', profile.user_id)
        .eq('ai_agent_enabled', false)
        .lt('updated_at', cutoffTime.toISOString());

      if (customersError) {
        console.error(`Error fetching customers for user ${profile.user_id}:`, customersError);
      } else if (customersToReactivate && customersToReactivate.length > 0) {
        console.log(`Found ${customersToReactivate.length} Evolution customers to reactivate for user ${profile.user_id}`);
        
        // Reactivate Evolution customers (update customers table)
        for (const customer of customersToReactivate) {
          const { error: updateError } = await supabase
            .from('customers')
            .update({ 
              ai_agent_enabled: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', customer.id);

          if (updateError) {
            console.error(`Error reactivating customer ${customer.id}:`, updateError);
            continue;
          }

          console.log(`Reactivated AI agent for Evolution customer: ${customer.id}`);
          totalReactivated++;
        }
      }
    }

    console.log(`Auto-reactivation completed. Total chats reactivated: ${totalReactivated}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Auto-reactivation completed successfully`,
      reactivated: totalReactivated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in auto-reactivate-agents function:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});