// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { apiUrl, apiKey, instanceName } = await req.json()

    console.log('Validating credentials:', { apiUrl, instanceName })

    if (!apiUrl || !apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: apiUrl and apiKey are required.' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Clean URL (remove trailing slash)
    const cleanUrl = apiUrl.replace(/\/$/, '')

    // Test connection by fetching instance info
    const baseUrl = `${cleanUrl}/instance/fetchInstances`;
    const listUrl = instanceName ? `${baseUrl}?instanceName=${encodeURIComponent(instanceName)}` : baseUrl;
    const response = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      }
    })

    console.log('Evolution API response status:', response.status)

    if (response.ok) {
      const data = await response.json()
      console.log('Instance data:', data)

      // Resolve instance name automatically when not provided
      const list = Array.isArray(data) ? data : []
      let resolvedName: string | null = null

      if (instanceName) {
        const match = list.find((inst: any) => inst?.name === instanceName)
        if (match) resolvedName = instanceName
      } else {
        const open = list.find((inst: any) => inst?.connectionStatus === 'open')
        resolvedName = open?.name || list[0]?.name || null
      }

      if (resolvedName) {
        return new Response(
          JSON.stringify({ success: true, message: 'Credentials validated successfully', instanceName: resolvedName }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        return new Response(
          JSON.stringify({ success: false, error: instanceName ? `Instance '${instanceName}' not found` : 'No instances found for these credentials' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else {
      const errorText = await response.text()
      console.error('Evolution API error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API error: ${response.status}`,
          details: errorText
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error validating credentials:', error)
    return new Response(
      JSON.stringify({ success: false, error: `Unexpected error: ${error?.message || 'Unknown error'}` }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
