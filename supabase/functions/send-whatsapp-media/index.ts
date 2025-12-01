// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, mediatype, fileName, media, userEmail, caption } = await req.json()

    console.log('Received media request:', { number, mediatype, fileName, media, userEmail, caption })

    if (!number || !mediatype || !fileName || !media || !userEmail) {
      console.log('Missing fields:', { hasNumber: !!number, hasMediatype: !!mediatype, hasFileName: !!fileName, hasMedia: !!media, hasUserEmail: !!userEmail })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: number, mediatype, fileName, media, userEmail' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's Evolution API credentials
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error listing users:', usersError)
      throw usersError
    }

    const authUser = users.users.find(u => u.email === userEmail)
    if (!authUser) {
      throw new Error('User not found')
    }

    const { data: credentials, error: credError } = await supabase
      .from('whatsapp_evolution_credentials')
      .select('api_url, api_key, instance_name')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (credError) {
      console.error('Credentials error:', credError)
      throw credError
    }

    if (!credentials) {
      console.error('No credentials found for user:', userEmail)
      return new Response(
        JSON.stringify({ error: 'Evolution API credentials not found. Please configure them first.' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const cleanUrl = credentials.api_url.replace(/\/$/, '')
    const url = `${cleanUrl}/message/sendMedia/${credentials.instance_name}`

    console.log(`Making request to: ${url}`)
    console.log('Request payload:', { number, mediatype, fileName, media })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': credentials.api_key
      },
      body: JSON.stringify({
        number: number,
        mediatype: mediatype,
        fileName: fileName,
        media: media,
        ...(caption && { caption: caption })
      })
    })

    console.log('Response status:', response.status)
    const result = await response.json()
    console.log('Response body:', result)

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`)
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending WhatsApp media:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})