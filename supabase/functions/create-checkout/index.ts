
// Follow our docs at https://supabase.io/docs/guides/functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const baseUrl = Deno.env.get("BASE_URL") || "";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan configuration - this would normally be stored in a database
const PLANS = {
  'plan_basic_monthly': {
    name: 'Basic',
    price: '9.99',
    interval: 'MONTH',
  },
  'plan_pro_monthly': {
    name: 'Pro',
    price: '19.99',
    interval: 'MONTH',
  },
  'plan_premium_monthly': {
    name: 'Premium',
    price: '49.99',
    interval: 'MONTH',
  }
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

// Create a PayPal subscription
async function createPayPalSubscription(planId: string, userId: string, token: string) {
  const plan = PLANS[planId as keyof typeof PLANS];
  if (!plan) throw new Error('Invalid plan ID');

  const accessToken = await getPayPalAccessToken();

  // First create a product
  const productResponse = await fetch('https://api-m.sandbox.paypal.com/v1/catalogs/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: `${plan.name} Subscription`,
      type: 'SERVICE',
      description: `${plan.name} subscription plan`,
    }),
  });

  const product = await productResponse.json();

  // Then create a billing plan
  const planResponse = await fetch('https://api-m.sandbox.paypal.com/v1/billing/plans', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      product_id: product.id,
      name: `${plan.name} Monthly Plan`,
      billing_cycles: [
        {
          frequency: {
            interval_unit: plan.interval,
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: plan.price,
              currency_code: 'USD',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD',
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });

  const billingPlan = await planResponse.json();

  // Finally create a subscription with a checkout link
  const subscriptionResponse = await fetch('https://api-m.sandbox.paypal.com/v1/billing/subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `${userId}-${Date.now()}`, // Idempotency key
    },
    body: JSON.stringify({
      plan_id: billingPlan.id,
      application_context: {
        brand_name: 'Your SaaS App',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: `${baseUrl}/success?user_id=${userId}&plan=${plan.name}`,
        cancel_url: `${baseUrl}/pricing`,
      },
      custom_id: `${userId}|${planId}`,
    }),
  });

  const subscription = await subscriptionResponse.json();
  
  // Get the approval URL
  const approvalUrl = subscription.links.find((link: any) => link.rel === 'approve').href;
  
  return {
    subscription_id: subscription.id,
    approval_url: approvalUrl,
    plan: plan.name,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { authorization } = req.headers;
    
    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(authorization?.split(' ')[1] || '');
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the request body
    const { planId } = await req.json();
    
    if (!planId) {
      return new Response(JSON.stringify({ error: 'Plan ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a PayPal subscription
    const { subscription_id, approval_url, plan } = await createPayPalSubscription(planId, user.id, authorization);
    
    // Return the approval URL
    return new Response(JSON.stringify({ url: approval_url, subscription_id, plan }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
