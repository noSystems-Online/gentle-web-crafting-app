
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SMTP configuration from environment variables
const smtpConfig = {
  host: Deno.env.get("SMTP_HOST") || "",
  port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
  username: Deno.env.get("SMTP_USERNAME") || "",
  password: Deno.env.get("SMTP_PASSWORD") || "",
  crypto: (Deno.env.get("SMTP_CRYPTO") || "tls") as "tls" | "ssl" | "none"
};

// Back up relay service for testing when SMTP is not configured
const FALLBACK_EMAIL_SERVICE = "https://api.emailjs.com/api/v1.0/email/send";
const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID") || "";
const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID") || "";
const EMAILJS_USER_ID = Deno.env.get("EMAILJS_USER_ID") || "";

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
  imageDataUrl?: string; // Base64 data URL of invitation image
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
    const { invitationId, invitationTitle, userId, imageDataUrl } = await req.json() as SendInvitationRequest;
    
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

    // Fetch invitation details to verify access and get title
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      console.error("Error fetching invitation:", invitationError);
      return new Response(JSON.stringify({
        success: false,
        error: "Invitation not found or access denied"
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Verify the user has access to this invitation
    if (invitation.user_id !== userId) {
      return new Response(JSON.stringify({
        success: false,
        error: "You don't have permission to access this invitation"
      }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get the reply-to email address and sender name from the invitation
    const replyToEmail = invitation.reply_to_email || null;
    const senderName = invitation.sender_name || "Invitation Service";

    // Check if SMTP is configured - we now check if the SMTP host is set rather than username/password
    // This makes SMTP the priority if it's configured
    const smtpConfigured = !!smtpConfig.host && !!smtpConfig.username && !!smtpConfig.password;
    
    // Only check EmailJS as fallback if SMTP is not configured
    if (!smtpConfigured && (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_USER_ID)) {
      return new Response(JSON.stringify({
        success: false,
        error: "No email sending method configured",
        details: "Please set up SMTP credentials or EmailJS configuration"
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

    // Get the base URL for RSVP links
    const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "https://invitecanvas.app"; // Fallback to production URL

    // Save the invitation image to the invitation record for later use on the RSVP page
    if (imageDataUrl) {
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ 
          custom_design_url: imageDataUrl
        })
        .eq('id', invitationId);
        
      if (updateError) {
        console.error("Error saving invitation image:", updateError);
        // Continue anyway since this is not critical
      }
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
        const htmlContent = generatePersonalizedHtml(guest, invitationTitle, publicAppUrl, imageDataUrl);

        let emailSent = false;
        
        // Try SMTP first if it's configured
        if (smtpConfigured) {
          try {
            // Prepare email payload for SMTP relay
            const emailPayload = {
              smtp: smtpConfig,
              email: {
                fromEmail: smtpConfig.username,
                fromName: senderName, // Use the sender name from invitation
                replyTo: replyToEmail, // Add the reply-to email address if available
                to: [guest.email],
                subject: `${invitationTitle} - You're Invited!`,
                text: `Dear ${guest.name}, you've been invited! Please check your email client to view this invitation properly.`,
                html: htmlContent
              }
            };

            console.log("Sending email via SMTP to:", guest.email);
            
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
              emailSent = true;
              results.push({
                guestId: guest.id,
                name: guest.name,
                status: "success",
                messageId: result.messageId || "sent",
                method: "smtp"
              });
              console.log("Email sent successfully via SMTP to:", guest.email);
            } else {
              console.error("SMTP sending failed with result:", result);
              throw new Error(result.message || "SMTP sending failed");
            }
          } catch (err) {
            console.error("SMTP sending failed:", err);
            // Will try EmailJS as fallback below if SMTP fails
          }
        }
        
        // Try EmailJS as fallback ONLY if SMTP failed or isn't configured
        if (!emailSent && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_USER_ID) {
          try {
            console.log("Falling back to EmailJS for:", guest.email);
            
            const emailjsPayload = {
              service_id: EMAILJS_SERVICE_ID,
              template_id: EMAILJS_TEMPLATE_ID,
              user_id: EMAILJS_USER_ID,
              template_params: {
                to_email: guest.email,
                to_name: guest.name,
                from_name: senderName, // Add sender name for EmailJS template
                invitation_title: invitationTitle,
                rsvp_link: `${publicAppUrl}/rsvp/${guest.id}`,
                message: `Please join us! View your invitation and RSVP here: ${publicAppUrl}/rsvp/${guest.id}`,
                reply_to: replyToEmail || "", // Add reply-to for EmailJS template
                invitation_image: imageDataUrl || "" // Add the invitation image for EmailJS template
              }
            };
            
            const response = await fetch(FALLBACK_EMAIL_SERVICE, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(emailjsPayload)
            });
            
            if (response.ok) {
              emailSent = true;
              results.push({
                guestId: guest.id,
                name: guest.name,
                status: "success",
                messageId: "emailjs-sent",
                method: "emailjs"
              });
              console.log("Email sent successfully via EmailJS to:", guest.email);
            } else {
              throw new Error(`EmailJS failed with status ${response.status}`);
            }
          } catch (err) {
            console.error("EmailJS sending failed:", err);
            throw new Error(`Failed to send invitation via EmailJS: ${err.message}`);
          }
        }
        
        // If email was sent successfully, update guest status
        if (emailSent) {
          const { error: updateError } = await supabase
            .from('guests')
            .update({ 
              sent_at: new Date().toISOString(), 
              rsvp_status: 'sent' 
            })
            .eq('id', guest.id);
            
          if (updateError) {
            console.error(`Error updating guest status: ${updateError.message}`);
            // We don't throw here since the email was sent
          }
        } else {
          throw new Error("All email sending methods failed");
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
function generatePersonalizedHtml(guest: Guest, invitationTitle: string, baseUrl: string, imageDataUrl?: string): string {
  const imageSection = imageDataUrl ? `
    <div style="text-align: center; margin: 20px 0;">
      <img src="${imageDataUrl}" alt="Invitation" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; max-height: 400px;" />
    </div>
  ` : '';
  
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
      
      ${imageSection}
      
      <p>You've been invited! Please click the button below to view your personal invitation and RSVP.</p>
      <p style="text-align: center;">
        <a href="${baseUrl}/rsvp/${guest.id}" class="button">View Invitation & RSVP</a>
      </p>
    </div>
    <div class="footer">
      <p>This invitation was sent using InviteCanvas. If you have any questions, please contact the event organizer.</p>
    </div>
  </body>
  </html>
  `;
}
