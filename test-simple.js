// Script simple para probar la función
const fetch = require('node:fetch');

const SUPABASE_URL = 'https://fczgowziugcvrpgfelks.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemVvd3ppdWdjdnJwZ2ZlbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3NzI5NDksImV4cCI6MjA0MDM0ODk0OX0.Hx-vMFrBNZJABJnSj5eoHoZmPNl2Y7o5-2_lOmGZALo';

async function testFunction() {
  try {
    console.log('Testing assign-order-tag function...');
    
    // Get a real customer ID first
    const ordersResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=customer_id,customer_name&order=created_at.desc&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    const orders = await ordersResponse.json();
    console.log('Recent orders:', orders);
    
    if (orders && orders.length > 0) {
      const customerId = orders[0].customer_id;
      console.log('Testing with customer ID:', customerId);
      
      // Test the function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/assign-order-tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          customer_id: customerId,
          user_id: null
        })
      });

      const data = await response.text();
      console.log('Function response status:', response.status);
      console.log('Function response data:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testFunction();

