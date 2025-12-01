// @ts-nocheck
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Creating assign_system_tag function...')

    // Create the function directly via SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create function for assigning system tags
        CREATE OR REPLACE FUNCTION public.assign_system_tag(
          target_customer_id uuid,
          tag_name_param text,
          tag_color_param text DEFAULT '#f59e0b',
          target_user_id uuid DEFAULT null
        )
        RETURNS uuid
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = 'public'
        AS $$
        DECLARE
          tag_id_var uuid;
          customer_tag_id uuid;
          user_id_var uuid;
        BEGIN
          -- Get user_id if not provided
          IF target_user_id IS NULL THEN
            SELECT user_id INTO user_id_var 
            FROM customers 
            WHERE id = target_customer_id;
          ELSE
            user_id_var := target_user_id;
          END IF;

          -- Create or find the tag
          INSERT INTO tags (name, color, user_id)
          VALUES (tag_name_param, tag_color_param, user_id_var)
          ON CONFLICT (name, user_id) 
          DO UPDATE SET color = EXCLUDED.color
          RETURNING id INTO tag_id_var;

          -- If couldn't create/find, search for existing
          IF tag_id_var IS NULL THEN
            SELECT id INTO tag_id_var 
            FROM tags 
            WHERE name = tag_name_param AND user_id = user_id_var;
          END IF;

          -- Assign tag to customer if not already assigned
          INSERT INTO customer_tags (customer_id, tag_id, user_id, assigned_by_type, assigned_at)
          VALUES (target_customer_id, tag_id_var, user_id_var, 'agent', now())
          ON CONFLICT (customer_id, tag_id) 
          DO UPDATE SET 
            assigned_by_type = 'agent',
            assigned_at = now()
          RETURNING id INTO customer_tag_id;

          RETURN customer_tag_id;
        END;
        $$;
      `
    })

    if (error) {
      console.error('Error creating function:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create function', details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Function created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'assign_system_tag function created successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-tag-functions:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

