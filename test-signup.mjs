import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://stoiutlxhwnijljjezgx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0b2l1dGx4aHduaWpsamplemd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjQ0MjcsImV4cCI6MjA4MDIwMDQyN30.Cc0WfQrwlUrp5UwqCBA47iH05vSwIY--nM3eihln1Yc'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testSignup() {
    console.log('Testing signup...')

    const { data, error } = await supabase.auth.signUp({
        email: 'test@test.com',
        password: 'test123456',
        options: {
            data: {
                business_name: 'Test Business',
                phone: '1234567890'
            }
        }
    })

    if (error) {
        console.error('Signup error:', error)
    } else {
        console.log('Signup success:', data)

        // Try to insert profile
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: data.user.id,
                    business_name: 'Test Business',
                    phone: '1234567890',
                    country_code: '+57',
                    onboarding_completed: false,
                    onboarding_current_step: 0
                })

            if (profileError) {
                console.error('Profile error:', profileError)
            } else {
                console.log('Profile created successfully')
            }
        }
    }
}

testSignup()
