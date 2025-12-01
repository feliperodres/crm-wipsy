import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DatabaseRow {
  [key: string]: any
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get parameters from URL
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const userHash = url.searchParams.get('userHash')
    const chatId = url.searchParams.get('chatId')

    if (!userId && !userHash) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or userHash parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If userHash is provided, decode it to get user email
    let targetUserId = userId
    if (userHash && !userId) {
      try {
        const decodedEmail = atob(userHash)
        console.log(`Decoded email from hash: ${decodedEmail}`)
        
        // Find user by email in profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', decodedEmail)
          .single()
        
        if (profileError || !profile) {
          console.error('Profile not found for email:', decodedEmail, profileError)
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        targetUserId = profile.user_id
        console.log(`Found user ID: ${targetUserId}`)
      } catch (error) {
        console.error('Error decoding userHash:', error)
        return new Response(
          JSON.stringify({ error: 'Invalid userHash format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine user ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Getting chat context for user: ${targetUserId}`)

    // Get user WhatsApp data
    const { data: userData, error: userError } = await supabase
      .rpc('get_user_whatsapp_data', { target_user_id: targetUserId })

    if (userError) {
      console.error('Error getting user data:', userError)
      return new Response(
        JSON.stringify({ error: 'Failed to get user data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get conversations
    const { data: conversations, error: conversationsError } = await supabase
      .rpc('get_user_conversations', { target_user_id: targetUserId })

    if (conversationsError) {
      console.error('Error getting conversations:', conversationsError)
      return new Response(
        JSON.stringify({ error: 'Failed to get conversations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If specific chatId is requested, get messages for that chat
    let messages = null
    if (chatId) {
      const { data: chatMessages, error: messagesError } = await supabase
        .rpc('get_chat_messages', { 
          target_chat_id: chatId, 
          target_user_id: targetUserId 
        })

      if (messagesError) {
        console.error('Error getting messages:', messagesError)
      } else {
        messages = chatMessages
      }
    }

    const response = {
      user: userData?.[0] || null,
      conversations: conversations || [],
      messages: messages,
      context: {
        userId: targetUserId,
        chatId: chatId || null,
        timestamp: new Date().toISOString()
      }
    }

    console.log(`Successfully retrieved chat context for user ${targetUserId}`)
    console.log(`Found ${conversations?.length || 0} conversations`)
    if (messages) {
      console.log(`Found ${messages.length} messages for chat ${chatId}`)
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in get-chat-context function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})