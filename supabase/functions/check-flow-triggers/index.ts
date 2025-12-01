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

    console.log('[Flow Trigger Check] Starting periodic trigger check...');

    // Get all active flows with time-based triggers
    const { data: flows, error: flowsError } = await supabase
      .from('automation_flows')
      .select('id, user_id, name, flow_type, trigger_conditions')
      .eq('is_active', true);

    if (flowsError) {
      console.error('[Flow Trigger Check] Error fetching flows:', flowsError);
      throw flowsError;
    }

    if (!flows || flows.length === 0) {
      console.log('[Flow Trigger Check] No active flows found');
      return new Response(JSON.stringify({ checked: 0, triggered: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Flow Trigger Check] Found ${flows.length} active flows`);

    let triggeredCount = 0;

    // Process each flow
    for (const flow of flows) {
      const conditions = flow.trigger_conditions || {};
      
      // Check inactivity trigger
      if (conditions.on_inactivity?.enabled) {
        const inactivityHours = conditions.on_inactivity.hours || 24;
        const inactivityThreshold = new Date(Date.now() - inactivityHours * 60 * 60 * 1000).toISOString();
        
        console.log(`[Flow Trigger Check] Checking inactivity trigger for flow \"${flow.name}\" (${inactivityHours}h)`);

        // Find chats that haven't had activity in X hours
        const { data: inactiveChats, error: chatsError } = await supabase
          .from('chats')
          .select('id, customer_id, user_id')
          .eq('user_id', flow.user_id)
          .eq('status', 'active')
          .lt('last_message_at', inactivityThreshold);

        if (chatsError) {
          console.error('[Flow Trigger Check] Error fetching inactive chats:', chatsError);
          continue;
        }

        if (inactiveChats && inactiveChats.length > 0) {
          console.log(`[Flow Trigger Check] Found ${inactiveChats.length} inactive chats for flow ${flow.id}`);

          for (const chat of inactiveChats) {
            // Check if this flow should repeat or is one-time only
            const shouldRepeat = conditions.on_inactivity.repeat ?? true;
            
            if (shouldRepeat) {
              // If repeating, check cooldown of 24h
              const cooldownHours = 24;
              const cooldownThreshold = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();

              const { data: recentExecution } = await supabase
                .from('flow_executions')
                .select('id, started_at')
                .eq('flow_id', flow.id)
                .eq('chat_id', chat.id)
                .eq('trigger_type', 'inactivity')
                .gte('started_at', cooldownThreshold)
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

              if (recentExecution) {
                console.log(`[Flow Cooldown] Skipping repeatable flow ${flow.id} for chat ${chat.id} - executed at ${recentExecution.started_at}`);
                continue;
              }
            } else {
              // If one-time only, check if it was ever executed for this chat
              const { data: anyExecution } = await supabase
                .from('flow_executions')
                .select('id, started_at')
                .eq('flow_id', flow.id)
                .eq('chat_id', chat.id)
                .eq('trigger_type', 'inactivity')
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

              if (anyExecution) {
                console.log(`[Flow One-Time] Skipping one-time flow ${flow.id} for chat ${chat.id} - already executed at ${anyExecution.started_at}`);
                continue;
              }
            }

            // Execute flow
            console.log(`[Flow Execution] Triggering inactivity flow \"${flow.name}\" for chat ${chat.id}`);
            
            const { error: invokeError } = await supabase.functions.invoke('execute-flow', {
              body: {
                flowId: flow.id,
                customerId: chat.customer_id,
                chatId: chat.id,
                userId: chat.user_id,
                triggerType: 'inactivity',
              },
            });

            if (invokeError) {
              console.error(`[Flow Execution] Error invoking flow ${flow.id}:`, invokeError);
            } else {
              triggeredCount++;
              console.log(`[Flow Execution] Successfully triggered flow ${flow.id} for chat ${chat.id}`);
            }
          }
        }
      }

      // Check no_response trigger (based on time since last message, regardless of sender)
      if (conditions.on_no_response?.enabled) {
        const noResponseHours = conditions.on_no_response.hours || 3;
        const noResponseThreshold = new Date(Date.now() - noResponseHours * 60 * 60 * 1000).toISOString();
        
        console.log(`[Flow Trigger Check] Checking no_response trigger for flow "${flow.name}" (${noResponseHours}h)`);

        // Find chats that haven't had activity in X hours
        const { data: noResponseChats, error: chatsError } = await supabase
          .from('chats')
          .select('id, customer_id, user_id, last_message_at')
          .eq('user_id', flow.user_id)
          .eq('status', 'active')
          .lt('last_message_at', noResponseThreshold);

        if (chatsError) {
          console.error('[Flow Trigger Check] Error fetching no_response chats:', chatsError);
          continue;
        }

        if (noResponseChats && noResponseChats.length > 0) {
          console.log(`[Flow Trigger Check] Found ${noResponseChats.length} chats with no response for flow ${flow.id}`);

          for (const chat of noResponseChats) {
            // Check if this flow should repeat or is one-time only
            const shouldRepeat = conditions.on_no_response.repeat ?? true;
            
            if (shouldRepeat) {
              // If repeating, check cooldown of 24h
              const cooldownHours = 24;
              const cooldownThreshold = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();

              const { data: recentExecution } = await supabase
                .from('flow_executions')
                .select('id, started_at')
                .eq('flow_id', flow.id)
                .eq('chat_id', chat.id)
                .eq('trigger_type', 'no_response')
                .gte('started_at', cooldownThreshold)
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

              if (recentExecution) {
                console.log(`[Flow Cooldown] Skipping repeatable flow ${flow.id} for chat ${chat.id} - executed at ${recentExecution.started_at}`);
                continue;
              }
            } else {
              // If one-time only, check if it was ever executed for this chat
              const { data: anyExecution } = await supabase
                .from('flow_executions')
                .select('id, started_at')
                .eq('flow_id', flow.id)
                .eq('chat_id', chat.id)
                .eq('trigger_type', 'no_response')
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

              if (anyExecution) {
                console.log(`[Flow One-Time] Skipping one-time flow ${flow.id} for chat ${chat.id} - already executed at ${anyExecution.started_at}`);
                continue;
              }
            }

            // Execute flow
            console.log(`[Flow Execution] Triggering no_response flow "${flow.name}" for chat ${chat.id} (last message: ${chat.last_message_at})`);
            
            const { error: invokeError } = await supabase.functions.invoke('execute-flow', {
              body: {
                flowId: flow.id,
                customerId: chat.customer_id,
                chatId: chat.id,
                userId: chat.user_id,
                triggerType: 'no_response',
              },
            });

            if (invokeError) {
              console.error(`[Flow Execution] Error invoking flow ${flow.id}:`, invokeError);
            } else {
              triggeredCount++;
              console.log(`[Flow Execution] Successfully triggered flow ${flow.id} for chat ${chat.id}`);
            }
          }
        }
      }
    }

    console.log(`[Flow Trigger Check] Completed. Checked ${flows.length} flows, triggered ${triggeredCount} executions`);

    return new Response(
      JSON.stringify({ success: true, checked: flows.length, triggered: triggeredCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Flow Trigger Check] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
