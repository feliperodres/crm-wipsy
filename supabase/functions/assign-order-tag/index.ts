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

    const { customer_id, user_id } = await req.json()

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Assigning "Pedido Nuevo" tag to customer:', customer_id)
    console.log('User ID provided:', user_id)

    // Validate customer_id format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(customer_id)) {
      console.error('Invalid customer_id format:', customer_id)
      return new Response(
        JSON.stringify({ error: 'Invalid customer_id format. Must be a valid UUID.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // First check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, user_id, name')
      .eq('id', customer_id)
      .single()

    if (customerError) {
      console.error('Error finding customer:', customerError)
      return new Response(
        JSON.stringify({ error: 'Customer not found', details: customerError }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Customer found:', customer.name, 'User ID:', customer.user_id)

    const finalUserId = user_id || customer.user_id;
    console.log('Final user ID to use:', finalUserId);

    // Step 1: Create or find the "Pedido Nuevo" tag
    let tagId: string;
    
    // First try to find existing tag
    const { data: existingTag, error: findTagError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', 'Pedido Nuevo')
      .eq('user_id', finalUserId)
      .single();

    if (existingTag) {
      tagId = existingTag.id;
      console.log('Found existing tag:', tagId);
    } else {
      // Create new tag
      const { data: newTag, error: createTagError } = await supabase
        .from('tags')
        .insert({
          name: 'Pedido Nuevo',
          color: '#10b981',
          user_id: finalUserId
        })
        .select('id')
        .single();

      if (createTagError) {
        console.error('Error creating tag:', createTagError);
        return new Response(
          JSON.stringify({ error: 'Failed to create tag', details: createTagError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      tagId = newTag.id;
      console.log('Created new tag:', tagId);
    }

    // Step 2: Assign tag to customer
    const { data: customerTag, error: assignError } = await supabase
      .from('customer_tags')
      .upsert({
        customer_id: customer_id,
        tag_id: tagId,
        user_id: finalUserId,
        assigned_by_type: 'agent',
        assigned_at: new Date().toISOString()
      }, {
        onConflict: 'customer_id,tag_id'
      })
      .select('id')
      .single();

    if (assignError) {
      console.error('Error assigning tag to customer:', assignError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign tag to customer', details: assignError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Tag assigned successfully. Customer tag ID:', customerTag.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        customer_tag_id: customerTag.id,
        tag_id: tagId,
        message: 'Tag "Pedido Nuevo" assigned successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Error in assign-order-tag function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
