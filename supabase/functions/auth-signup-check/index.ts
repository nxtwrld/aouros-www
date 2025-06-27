import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const betaOnlyMode = Deno.env.get('BETA_ONLY_MODE') === 'true'
    const hookSecret = Deno.env.get('SUPABASE_AUTH_HOOK_SECRET')
    
    // Verify hook secret for security
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${hookSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Parse the auth event
    const { event, user } = await req.json()
    
    // Only process signup events
    if (event !== 'user.signup') {
      return new Response(
        JSON.stringify({ decision: 'continue' }),
        { headers: corsHeaders }
      )
    }

    // If beta mode is disabled, allow all signups
    if (!betaOnlyMode) {
      return new Response(
        JSON.stringify({ 
          decision: 'continue',
          message: 'Public signup allowed'
        }),
        { headers: corsHeaders }
      )
    }

    // Beta mode is enabled - check if user is approved
    const userEmail = user.email?.toLowerCase()
    
    if (!userEmail) {
      return new Response(
        JSON.stringify({ 
          decision: 'reject',
          message: 'Email is required for beta access'
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Create Supabase client to check beta applications
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if email is in approved beta applications
    const { data: betaApplication, error: checkError } = await supabase
      .from('beta_applications')
      .select('id, status, name, user_type')
      .eq('email', userEmail)
      .eq('status', 'approved')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking beta applications:', checkError)
      return new Response(
        JSON.stringify({ 
          decision: 'reject',
          message: 'Unable to verify beta access. Please try again.'
        }),
        { status: 500, headers: corsHeaders }
      )
    }

    // If no approved beta application found
    if (!betaApplication) {
      // Check if they have a pending application
      const { data: pendingApp } = await supabase
        .from('beta_applications')
        .select('status')
        .eq('email', userEmail)
        .single()

      let message = 'Beta access required. Please apply for beta access first.'
      
      if (pendingApp) {
        if (pendingApp.status === 'pending') {
          message = 'Your beta application is under review. Please wait for approval.'
        } else if (pendingApp.status === 'rejected') {
          message = 'Your beta application was not approved. Please contact support if you believe this is an error.'
        }
      }

      return new Response(
        JSON.stringify({ 
          decision: 'reject',
          message
        }),
        { status: 403, headers: corsHeaders }
      )
    }

    // User is approved for beta access
    console.log(`Approved beta signup for: ${userEmail} (${betaApplication.name})`)
    
    return new Response(
      JSON.stringify({ 
        decision: 'continue',
        message: 'Beta access approved',
        user_metadata: {
          beta_application_id: betaApplication.id,
          name: betaApplication.name,
          user_type: betaApplication.user_type,
          is_beta_user: true
        }
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Auth hook error:', error)
    
    // In case of error, we should decide whether to be permissive or restrictive
    // For security, we'll be restrictive in beta mode
    const betaOnlyMode = Deno.env.get('BETA_ONLY_MODE') === 'true'
    
    if (betaOnlyMode) {
      return new Response(
        JSON.stringify({ 
          decision: 'reject',
          message: 'Signup temporarily unavailable. Please try again later.'
        }),
        { status: 500, headers: corsHeaders }
      )
    } else {
      // In non-beta mode, allow signup even if there's an error
      return new Response(
        JSON.stringify({ 
          decision: 'continue',
          message: 'Signup allowed (fallback)'
        }),
        { headers: corsHeaders }
      )
    }
  }
})