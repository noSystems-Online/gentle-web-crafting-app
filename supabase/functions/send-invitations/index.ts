
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SMTP configuration from environment variables
const smtpConfig = {
  host: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
  port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
  username: Deno.env.get("SMTP_USERNAME") || "",
  password: Deno.env.get("SMTP_PASSWORD") || "",
  crypto: (Deno.env.get("SMTP_CRYPTO") || "tls") as "tls" | "ssl" | "none"
};

interface Guest {
  id: string;
  name: string;
  email: string;
  invitation_id: string;
}

interface SendInvitationRequest {
  invitationId: string;
  invitationTitle: string;
  userId: string;
}

// Email relay service endpoint
const EMAIL_RELAY_URL = "https://email-relay-express-gateway.onrender.com/api/send-mail";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request data
    const { invitationId, invitationTitle, userId } = await req.json() as SendInvitationRequest;
    
    // Create Supabase client with auth context from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing authorization header" 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Initialize Supabase client with the token from the request
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Check if SMTP credentials are configured
    if (!smtpConfig.username || !smtpConfig.password) {
      return new Response(JSON.stringify({
        success: false,
        error: "SMTP credentials not configured"
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Fetch guests for this invitation
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('invitation_id', invitationId);
    
    if (guestError) {
      throw new Error(`Error fetching guests: ${guestError.message}`);
    }
    
    if (!guests || guests.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No guests found for this invitation"
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Send emails to each guest
    const results = [];
    for (const guest of guests) {
      // Skip guests who already received invitations
      if (guest.sent_at) {
        results.push({
          guestId: guest.id,
          name: guest.name,
          status: "skipped",
          message: "Invitation already sent"
        });
        continue;
      }

      try {
        // Generate HTML content for this guest
        const htmlContent = generatePersonalizedHtml(guest, invitationTitle);

        // Prepare email payload
        const emailPayload = {
          smtp: smtpConfig,
          email: {
            fromEmail: smtpConfig.username,
            fromName: "Invitation Service",
            to: [guest.email],
            subject: `${invitationTitle} - You're Invited!`,
            text: `Dear ${guest.name}, you've been invited! Please check your email client to view this invitation properly.`,
            html: htmlContent
          }
        };

        // Send email using relay service
        const response = await fetch(EMAIL_RELAY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailPayload)
        });

        const result = await response.json();

        if (result.success) {
          // Update guest's sent_at timestamp in database
          const { error } = await supabase
            .from('guests')
            .update({ 
              sent_at: new Date().toISOString(), 
              rsvp_status: 'sent' 
            })
            .eq('id', guest.id);
            
          if (error) {
            throw new Error(`Error updating guest status: ${error.message}`);
          }
          
          results.push({
            guestId: guest.id,
            name: guest.name,
            status: "success",
            messageId: result.messageId
          });
        } else {
          throw new Error(result.message || "Unknown email sending error");
        }
      } catch (error) {
        console.error(`Error sending invitation to ${guest.name}:`, error);
        results.push({
          guestId: guest.id,
          name: guest.name,
          status: "failed",
          error: error.message
        });
      }
    }

    // Calculate results
    const successCount = results.filter(r => r.status === "success").length;
    const failedCount = results.filter(r => r.status === "failed").length;
    const skippedCount = results.filter(r => r.status === "skipped").length;

    return new Response(JSON.stringify({
      success: true,
      results: {
        total: guests.length,
        sent: successCount,
        failed: failedCount,
        skipped: skippedCount,
        details: results
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Error in send-invitations function:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// Function to generate HTML for a personalized invitation
function generatePersonalizedHtml(guest: Guest, invitationTitle: string): string {
  const host = Deno.env.get("PUBLIC_APP_URL") || "https://app.example.com";
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${invitationTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      h1 { color: #4a5568; text-align: center; }
      .invitation { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #f7fafc; }
      .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #718096; }
      .button { display: inline-block; background-color: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <h1>${invitationTitle}</h1>
    <div class="invitation">
      <p>Dear ${guest.name},</p>
      <p>You've been invited! Please click the button below to view your personal invitation and RSVP.</p>
      <p style="text-align: center;">
        <a href="${host}/rsvp/${guest.id}" class="button">View Invitation & RSVP</a>
      </p>
    </div>
    <div class="footer">
      <p>This invitation was sent using InviteCanvas. If you have any questions, please contact the event organizer.</p>
    </div>
  </body>
  </html>
  `;
}
