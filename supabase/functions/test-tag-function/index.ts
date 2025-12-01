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

    console.log('Testing if assign_system_tag function exists...')

    // Test if the function exists by trying to call it with test data
    const { data, error } = await supabase.rpc('assign_system_tag', {
      target_customer_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      tag_name_param: 'Test Tag',
      tag_color_param: '#ff0000',
      target_user_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID
    })

    console.log('Function call result:', { data, error })

    return new Response(
      JSON.stringify({ 
        function_exists: error?.code !== '42883', // 42883 = function does not exist
        test_result: { data, error },
        message: error?.code === '42883' ? 'Function does not exist' : 'Function exists (may have failed due to invalid test data)'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error testing function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

