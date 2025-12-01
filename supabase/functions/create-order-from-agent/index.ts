// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      customer_name,
      customer_last_name,
      customer_address,
      customer_phone,
      customer_email,
      products,
      Departamento,
      ciudad,
      forma_de_pago,
      user_id,
      customer_id,
      shipping_tariff,
      order_source
    } = body;

    console.log('Received order creation request:', {
      customer_name,
      customer_last_name,
      customer_address,
      customer_phone,
      customer_email,
      products,
      Departamento,
      ciudad,
      forma_de_pago,
      user_id,
      customer_id,
      shipping_tariff,
      order_source
    });

    // Validate required fields
    if (!customer_name || !customer_address || !products || !user_id || !shipping_tariff) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shipping_tariff is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get store settings to fetch shipping rates
    const { data: storeData, error: storeError } = await supabase
      .from('store_settings')
      .select('shipping_rates')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (storeError) {
      console.error('Error fetching store data:', storeError);
      return new Response(
        JSON.stringify({ error: 'Could not fetch store settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse shipping rates and find the selected tariff
    let shippingRates = [];
    let selectedShippingRate = null;
    let shippingCost = 0;

    if (storeData?.shipping_rates) {
      try {
        if (Array.isArray(storeData.shipping_rates)) {
          shippingRates = storeData.shipping_rates;
        } else if (typeof storeData.shipping_rates === 'string') {
          shippingRates = JSON.parse(storeData.shipping_rates);
        }

        // Robust find by id or name (case-insensitive), accepting object or string
        const norm = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : String(v ?? '').trim().toLowerCase());
        const candidateId = typeof shipping_tariff === 'object' && shipping_tariff !== null 
          ? (shipping_tariff.id ?? shipping_tariff.name) 
          : shipping_tariff;
        const candidateName = typeof shipping_tariff === 'object' && shipping_tariff !== null 
          ? (shipping_tariff.name ?? shipping_tariff.id) 
          : shipping_tariff;

        selectedShippingRate = shippingRates.find((rate: any) => {
          const rateId = String(rate.id ?? '').trim();
          const rateName = String(rate.name ?? '').trim();
          return rateId === String(candidateId ?? '').trim() 
            || norm(rateName) === norm(candidateName);
        });

        if (selectedShippingRate) {
          shippingCost = Number(selectedShippingRate.price) || 0;
        }
      } catch (error) {
        console.error('Error parsing shipping rates:', error);
      }
    }

    if (!selectedShippingRate) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid shipping_tariff. No matching shipping rate found in store settings.',
          provided: shipping_tariff,
          available_rates: shippingRates.map((r: any) => ({ id: r.id, name: r.name }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Selected shipping rate:', selectedShippingRate);
    console.log('Shipping cost:', shippingCost);

    // Parse products
    let parsedProducts = [];
    try {
      if (Array.isArray(products)) {
        parsedProducts = products;
      } else if (typeof products === 'string') {
        parsedProducts = JSON.parse(products);
      }
    } catch (error) {
      console.error('Error parsing products:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid products format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total from products
    const subtotal = parsedProducts.reduce((total: number, product: any) => {
      const price = Number(product.precio ?? product.price ?? 0);
      const quantity = Number(product.cantidad ?? product.quantity ?? 1);
      return total + (price * quantity);
    }, 0);

    const total = subtotal + shippingCost;

    console.log('Order calculation:', { subtotal, shippingCost, total });

    // Map payment method to allowed values
    const mapPaymentMethod = (method: string): string => {
      const methodLower = method?.toLowerCase().trim() || '';
      
      if (methodLower.includes('contra entrega') || methodLower.includes('contraentrega')) {
        return 'Pago Contra Entrega';
      }
      if (methodLower.includes('anticipado') || methodLower.includes('adelanto')) {
        return 'Anticipado';
      }
      if (methodLower.includes('transferencia')) {
        return 'Transferencia';
      }
      if (methodLower.includes('efectivo')) {
        return 'Efectivo';
      }
      if (methodLower.includes('tarjeta')) {
        return 'Tarjeta';
      }
      
      // Default fallback
      return 'Pago Contra Entrega';
    };

    const mappedPaymentMethod = mapPaymentMethod(forma_de_pago);
    console.log('Payment method mapping:', { original: forma_de_pago, mapped: mappedPaymentMethod });

    // Update or create customer
    let finalCustomerId = customer_id;

    // Deduplicate by phone/email if no id provided
    if (!finalCustomerId && (customer_phone || customer_email)) {
      try {
        const orParts: string[] = [];
        if (customer_phone) orParts.push(`phone.eq.${customer_phone}`);
        if (customer_email) orParts.push(`email.eq.${customer_email}`);
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user_id)
          .or(orParts.join(','))
          .maybeSingle();
        if (existing?.id) finalCustomerId = existing.id as string;
      } catch (e) {
        console.warn('Customer dedup lookup failed:', e);
      }
    }

    if (finalCustomerId) {
      // Update existing customer with additional info
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: customer_name,
          last_name: customer_last_name,
          address: customer_address,
          city: ciudad,
          province: Departamento,
          phone: customer_phone ?? undefined,
          email: customer_email ?? undefined,
        })
        .eq('id', finalCustomerId)
        .eq('user_id', user_id);

      if (updateError) {
        console.error('Error updating customer:', updateError);
      }
    } else {
      // Create new customer if no ID found
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          user_id: user_id,
          name: customer_name,
          last_name: customer_last_name,
          address: customer_address,
          city: ciudad,
          province: Departamento,
          phone: customer_phone ?? null,
          email: customer_email ?? null,
        })
        .select()
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return new Response(
          JSON.stringify({ error: 'Could not create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      finalCustomerId = newCustomer.id;
    }

    // Determine order source (default 'agent' if not provided or invalid)
    const orderSource = typeof order_source === 'string' && order_source.toLowerCase() === 'store' ? 'store' : 'agent';

    // Create order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user_id,
        customer_id: finalCustomerId,
        total: total,
        shipping_cost: shippingCost,
        shipping_tariff_id: selectedShippingRate?.id || shipping_tariff,
        payment_method: mappedPaymentMethod,
        status: 'pendiente',
        order_source: orderSource,
        notes: `Pedido creado por IA Agent. Departamento: ${Departamento}, Ciudad: ${ciudad}`
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Could not create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created:', newOrder);

    // Create order items with robust product id resolution (accept product_id/id/variant_id)
    try {
      let createdCount = 0;
      for (const product of parsedProducts) {
        const candidateId = product?.product_id ?? product?.id ?? product?.variant_id ?? product?.sku ?? product?.handle;
        const candidateName = product?.nombre ?? product?.name ?? null;
        const qty = Number(product?.cantidad ?? product?.quantity ?? 1);
        const unitPrice = Number(product?.precio ?? product?.price ?? 0);

        if (!candidateId && !candidateName) {
          console.warn('Skipping product with missing identifiers:', product);
          continue;
        }

        let actualProductId: string | null = null;

        // 1) Variant by UUID id
        if (candidateId) {
          const { data: varById } = await supabase
            .from('product_variants')
            .select('product_id')
            .eq('id', String(candidateId))
            .maybeSingle();
          if (varById?.product_id) actualProductId = varById.product_id as string;
        }

        // 2) Variant by Shopify ID
        if (!actualProductId && candidateId) {
          const { data: varByShop } = await supabase
            .from('product_variants')
            .select('product_id')
            .eq('shopify_id', String(candidateId))
            .maybeSingle();
          if (varByShop?.product_id) actualProductId = varByShop.product_id as string;
        }

        // 3) Product by UUID id
        if (!actualProductId && candidateId) {
          const { data: prodById } = await supabase
            .from('products')
            .select('id')
            .eq('id', String(candidateId))
            .maybeSingle();
          if (prodById?.id) actualProductId = prodById.id as string;
        }

        // 4) Product by Shopify ID
        if (!actualProductId && candidateId) {
          const { data: prodByShop } = await supabase
            .from('products')
            .select('id')
            .eq('shopify_id', String(candidateId))
            .maybeSingle();
          if (prodByShop?.id) actualProductId = prodByShop.id as string;
        }

        // 5) Fallback by name for this user
        if (!actualProductId && candidateName) {
          const { data: prodByName } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', user_id)
            .ilike('name', candidateName)
            .maybeSingle();
          if (prodByName?.id) actualProductId = prodByName.id as string;
        }

        if (!actualProductId) {
          console.error('Product could not be resolved for order item:', { candidateId, candidateName, product });
          // Create a minimal, hidden product so the order can proceed
          try {
            const tempName = (candidateName || 'Producto personalizado').toString().slice(0, 120);
            const { data: tempProd, error: tempErr } = await supabase
              .from('products')
              .insert({
                user_id: user_id,
                name: tempName,
                description: 'Creado automáticamente desde pedido del agente (placeholder)'.slice(0, 255),
                price: isFinite(unitPrice) ? unitPrice : 0,
                stock: 0,
                is_active: false,
              })
              .select('id')
              .single();
            if (tempErr || !tempProd?.id) {
              console.error('Failed to create placeholder product:', tempErr);
              continue;
            }
            actualProductId = tempProd.id as string;
          } catch (createTempErr) {
            console.error('Unexpected error creating placeholder product:', createTempErr);
            continue;
          }
        }

        const { error: itemErr } = await supabase
          .from('order_items')
          .insert({
            order_id: newOrder.id,
            product_id: actualProductId,
            quantity: qty,
            price: unitPrice,
          });

        if (itemErr) {
          console.error('Error inserting order item:', itemErr, { order_id: newOrder.id, actualProductId, qty, unitPrice });
          continue;
        }
        createdCount += 1;
      }

      if (createdCount === 0) {
        console.warn('No order items created for order:', newOrder.id);
      } else {
        console.log(`Order items created successfully: ${createdCount}`);
      }
    } catch (e) {
      console.error('Unexpected error creating order items:', e);
      return new Response(
        JSON.stringify({ error: 'Could not create order items', details: String(e?.message || e) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Asignar etiqueta "Pedido Nuevo" automáticamente (se crea si no existe)
    try {
      const { error: tagError } = await supabase.rpc('assign_system_tag', {
        target_customer_id: finalCustomerId,
        tag_name_param: 'Pedido Nuevo',
        tag_color_param: '#10b981', // Verde para pedidos nuevos
        target_user_id: user_id
      });

      if (tagError) {
        console.error('Error assigning Pedido Nuevo tag:', tagError);
        // No lanzamos error aquí porque el pedido ya se creó exitosamente
      } else {
        console.log('Pedido Nuevo tag assigned successfully');
      }
    } catch (tagError) {
      console.error('Error in tag assignment:', tagError);
    }

    // Send notification to admin about new order
    try {
      const notificationMessage = `Nuevo pedido de ${customer_name} ${customer_last_name || ''}`.trim();
      
      const notificationResponse = await supabase.functions.invoke('send-admin-notification', {
        body: {
          user_id: user_id,
          message: notificationMessage,
          notification_type: 'new_order',
          metadata: {
            customer_name: `${customer_name} ${customer_last_name || ''}`.trim(),
            order_id: newOrder.id,
            total_amount: total
          }
        }
      });

      if (notificationResponse.error) {
        console.error('Error sending admin notification:', notificationResponse.error);
        // No lanzamos error aquí porque el pedido ya se creó exitosamente
      } else {
        console.log('Admin notification sent successfully');
      }
    } catch (notificationError) {
      console.error('Error in admin notification:', notificationError);
    }

    // Assign "Pedido Nuevo" tag to customer
    try {
      console.log('🏷️ Starting tag assignment process...');
      console.log('Final Customer ID:', finalCustomerId);
      console.log('User ID:', user_id);
      console.log('Supabase URL:', Deno.env.get('SUPABASE_URL'));
      
      const tagRequestBody = {
        customer_id: finalCustomerId,
        user_id: user_id
      };
      
      console.log('Tag request body:', JSON.stringify(tagRequestBody));
      
      const tagResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/assign-order-tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify(tagRequestBody)
      });

      console.log('Tag response status:', tagResponse.status);
      const tagResponseText = await tagResponse.text();
      console.log('Tag response body:', tagResponseText);

      if (tagResponse.ok) {
        console.log('✅ Tag "Pedido Nuevo" assigned successfully');
        try {
          const tagData = JSON.parse(tagResponseText);
          console.log('Tag assignment result:', tagData);
        } catch (parseError) {
          console.log('Could not parse tag response as JSON');
        }
      } else {
        console.error('❌ Error assigning tag. Status:', tagResponse.status);
        console.error('Error response:', tagResponseText);
      }
    } catch (tagError) {
      console.error('💥 Exception in tag assignment:', tagError);
      console.error('Tag error stack:', tagError.stack);
      // Don't fail the order creation if tag assignment fails
    }

    // Try to create order in Shopify if integration exists
    try {
      console.log('🛍️ Attempting to create order in Shopify...');
      console.log('Order ID:', newOrder.id);
      console.log('User ID:', user_id);
      
      // Use direct HTTP call instead of supabase.functions.invoke for better error handling
      const shopifyFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-shopify-order`;
      console.log('Calling Shopify function at:', shopifyFunctionUrl);
      
      const shopifyResponse = await fetch(shopifyFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          order_id: newOrder.id,
          user_id: user_id
        })
      });

      const shopifyResponseText = await shopifyResponse.text();
      console.log('Shopify function response status:', shopifyResponse.status);
      console.log('Shopify function response:', shopifyResponseText);

      if (!shopifyResponse.ok) {
        console.error('❌ Error creating Shopify order. Status:', shopifyResponse.status);
        console.error('Response:', shopifyResponseText);
      } else {
        console.log('✅ Shopify order created successfully');
        try {
          const shopifyData = JSON.parse(shopifyResponseText);
          console.log('Shopify order data:', shopifyData);
        } catch (e) {
          console.log('Could not parse Shopify response as JSON');
        }
      }
    } catch (shopifyError) {
      console.error('💥 Exception creating Shopify order:', shopifyError);
      console.error('Error message:', shopifyError.message);
      console.error('Error stack:', shopifyError.stack);
      // Don't fail the order creation if Shopify sync fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id: newOrder.id, 
        total: total,
        shipping_cost: shippingCost,
        shipping_tariff: selectedShippingRate?.name || shipping_tariff
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-order-from-agent function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});