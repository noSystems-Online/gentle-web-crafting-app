
// Follow our docs at https://supabase.io/docs/guides/functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get PayPal access token
async function getPayPalAccessToken() {
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

// Verify webhook signature
async function verifyWebhookSignature(headers: Headers, body: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  const verification = await response.json();
  return verification.verification_status === 'SUCCESS';
}

// Handle subscription events
async function handleSubscriptionEvent(event: any, supabase: any) {
  const resource = event.resource;
  const customId = resource.custom_id || '';
  const [userId, planId] = customId.split('|');
  
  if (!userId) {
    console.error('No user ID found in custom_id');
    return;
  }

  const subscriptionId = resource.id;
  const status = resource.status;
  
  // Determine plan name from planId or just use the name from resource
  // For our app, we're only concerned with 'Pro' vs 'Free'
  let planName = 'Free'; // Default to free
  if (planId && planId.includes('pro')) {
    planName = 'Pro';
  }
  
  // Calculate the next billing date based on interval
  const currentPeriodEnd = new Date();
  const isYearly = planId && planId.includes('yearly');
  
  if (isYearly) {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  } else {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }

  console.log(`Processing subscription event: ${event.event_type} for user ${userId}, plan ${planName}, status ${status}`);

  switch (event.event_type) {
    case 'BILLING.SUBSCRIPTION.CREATED':
      // A new subscription was created
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          paypal_subscription_id: subscriptionId,
          plan: planName,
          status: status.toLowerCase(),
          current_period_end: currentPeriodEnd.toISOString(),
        });
        
      if (insertError) {
        console.error('Error inserting subscription:', insertError);
      }
      break;
      
    case 'BILLING.SUBSCRIPTION.UPDATED':
      // Subscription was updated
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: status.toLowerCase(),
          plan: planName, // Make sure to update plan name if it changed
          current_period_end: currentPeriodEnd.toISOString(),
        })
        .eq('paypal_subscription_id', subscriptionId);
        
      if (updateError) {
        console.error('Error updating subscription:', updateError);
      }
      break;
      
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      // Subscription was cancelled or expired
      const { error: cancelError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
        })
        .eq('paypal_subscription_id', subscriptionId);
        
      if (cancelError) {
        console.error('Error cancelling subscription:', cancelError);
      }
      break;
      
    case 'BILLING.SUBSCRIPTION.RENEWED':
      // Subscription was renewed - update the end date
      const { error: renewError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_end: currentPeriodEnd.toISOString(),
        })
        .eq('paypal_subscription_id', subscriptionId);
        
      if (renewError) {
        console.error('Error renewing subscription:', renewError);
      }
      break;

    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
      // Payment failed - mark subscription as past_due
      const { error: failError } = await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
        })
        .eq('paypal_subscription_id', subscriptionId);
        
      if (failError) {
        console.error('Error updating failed payment subscription:', failError);
      }
      break;
      
    default:
      console.log(`Unhandled event type: ${event.event_type}`);
  }
}

serve(async (req) => {
  // This endpoint is public to receive PayPal webhooks
  // We'll verify the signature to ensure it's from PayPal
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    // In production, uncomment this validation
    // const isValid = await verifyWebhookSignature(req.headers, body);
    // if (!isValid) {
    //   return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
    //     status: 400,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //   });
    // }
    
    // For development, we'll skip verification
    const isValid = true;
    
    const event = JSON.parse(body);
    console.log('Received webhook event:', event.event_type);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Handle subscription-related events
    if (event.event_type.startsWith('BILLING.SUBSCRIPTION.')) {
      await handleSubscriptionEvent(event, supabase);
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
