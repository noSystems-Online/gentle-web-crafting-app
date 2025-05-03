
// Follow our docs at https://supabase.io/docs/guides/functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to log steps for better debugging
function logStep(step: string, details?: any) {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ': ' + JSON.stringify(details) : ''}`);
}

serve(async (req) => {
  // This endpoint is public to receive Stripe webhooks
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.text();
    logStep('Received webhook body');

    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-11-15',
    });

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
      logStep('Webhook signature verified', { type: event.type });
    } catch (err) {
      logStep('Webhook signature verification failed', { error: err.message });
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Handle subscription events
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Get customer to find user email
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          throw new Error('Customer has been deleted');
        }

        // Get user by email
        const { data: users, error: userError } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', customer.email)
          .limit(1);

        if (userError || !users || users.length === 0) {
          throw new Error(`No user found for email ${customer.email}`);
        }

        const userId = users[0].id;
        const status = subscription.status;
        
        // Determine plan ('Free' or 'Pro')
        const isPro = subscription.items.data.some(item => 
          item.price.metadata.plan_level === 'pro' || item.price.metadata.plan === 'pro'
        );
        const planName = isPro ? 'Pro' : 'Free';
        
        // Calculate billing period end
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        
        // Update the subscription in our database
        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan: planName,
            status: status,
            current_period_end: currentPeriodEnd.toISOString(),
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          }, { onConflict: 'user_id' });

        if (upsertError) {
          logStep('Error updating subscription in database', upsertError);
          throw new Error(`Failed to update subscription: ${upsertError.message}`);
        }
        
        logStep('Subscription updated in database', { 
          userId, 
          status, 
          plan: planName, 
          end: currentPeriodEnd.toISOString() 
        });
        break;

      case 'customer.subscription.deleted':
        const cancelledSubscription = event.data.object;
        const cancelledCustomerId = cancelledSubscription.customer;
        
        // Get customer to find user email
        const cancelledCustomer = await stripe.customers.retrieve(cancelledCustomerId);
        if (cancelledCustomer.deleted) {
          throw new Error('Customer has been deleted');
        }

        // Get user by email
        const { data: cancelledUsers, error: cancelledUserError } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', cancelledCustomer.email)
          .limit(1);

        if (cancelledUserError || !cancelledUsers || cancelledUsers.length === 0) {
          throw new Error(`No user found for email ${cancelledCustomer.email}`);
        }

        const cancelledUserId = cancelledUsers[0].id;

        // Update subscription status to canceled
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('user_id', cancelledUserId);

        if (cancelError) {
          logStep('Error canceling subscription in database', cancelError);
          throw new Error(`Failed to cancel subscription: ${cancelError.message}`);
        }
        
        logStep('Subscription cancelled in database', { userId: cancelledUserId });
        break;

      default:
        logStep(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logStep('Error processing webhook', { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
