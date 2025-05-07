
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

// Email relay service endpoint
const EMAIL_RELAY_URL = "https://email-relay-express-gateway.onrender.com/api/send-mail";

interface RSVPNotificationRequest {
  guestId: string;
  guestName: string;
  guestEmail: string;
  invitationId: string;
  invitationTitle: string;
  rsvpStatus: string;
  rsvpMessage?: string;
  replyToEmail: string;
  senderName: string;
  imageDataUrl?: string; // Optional invitation image
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request data
    const {
      guestId,
      guestName,
      guestEmail,
      invitationId,
      invitationTitle,
      rsvpStatus,
      rsvpMessage,
      replyToEmail,
      senderName,
      imageDataUrl
    } = await req.json() as RSVPNotificationRequest;
    
    // Check if SMTP is configured
    const smtpConfigured = !!smtpConfig.host && !!smtpConfig.username && !!smtpConfig.password;
    
    if (!smtpConfigured) {
      return new Response(JSON.stringify({
        success: false,
        error: "SMTP not configured",
        details: "SMTP configuration is required for RSVP notifications"
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Generate the status message
    let statusMessage = "responded with";
    switch (rsvpStatus) {
      case "attending":
        statusMessage = "will be attending";
        break;
      case "declined":
        statusMessage = "cannot attend";
        break;
      case "maybe":
        statusMessage = "might attend";
        break;
      default:
        statusMessage = "responded to";
    }

    // Add the image if available
    let imageSection = '';
    if (imageDataUrl) {
      imageSection = `
        <div style="text-align: center; margin: 20px 0;">
          <img src="${imageDataUrl}" alt="Invitation" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; max-height: 300px;" />
        </div>
      `;
    }

    // Process the image for email attachment
    let attachmentData = null;
    if (imageDataUrl) {
      try {
        // Extract the base64 data (remove the data URL prefix)
        const base64Data = imageDataUrl.split(',')[1];
        if (base64Data) {
          attachmentData = {
            filename: `invitation-${invitationId}.png`,
            content: base64Data,
            encoding: 'base64',
            disposition: 'attachment'
          };
        }
      } catch (error) {
        console.error("Error processing image for attachment:", error);
        // Continue without attachment if processing fails
      }
    }

    // Generate HTML content for the notification email
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RSVP Update: ${invitationTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #4a5568; text-align: center; }
        .notification { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #f7fafc; }
        .message { background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; font-style: italic; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #718096; }
      </style>
    </head>
    <body>
      <h1>RSVP Update</h1>
      <div class="notification">
        <p><strong>${guestName}</strong> (${guestEmail}) ${statusMessage} your invitation: <strong>${invitationTitle}</strong>.</p>
        
        ${imageSection}
        
        ${rsvpMessage ? `
        <div class="message">
          <p><strong>Message:</strong></p>
          <p>"${rsvpMessage}"</p>
        </div>
        ` : ''}
      </div>
      <div class="footer">
        <p>This notification was sent from InviteCanvas. You're receiving this because you are the organizer of this invitation.</p>
      </div>
    </body>
    </html>
    `;

    // Prepare email payload for SMTP relay
    const emailPayload = {
      smtp: smtpConfig,
      email: {
        fromEmail: smtpConfig.username,
        fromName: "InviteCanvas Notifications",
        to: [replyToEmail],
        subject: `RSVP Update: ${guestName} ${statusMessage} "${invitationTitle}"`,
        text: `${guestName} (${guestEmail}) ${statusMessage} your invitation "${invitationTitle}".${rsvpMessage ? ` They left this message: "${rsvpMessage}"` : ''}`,
        html: htmlContent,
        replyTo: guestEmail, // Set reply-to as the guest's email so the organizer can reply directly
        attachments: attachmentData ? [attachmentData] : [] // Add image as attachment if available
      }
    };

    console.log("Sending RSVP notification via SMTP to:", replyToEmail);
    
    // Send email using relay service
    const response = await fetch(EMAIL_RELAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const result = await response.json();
    if (!result.success) {
      console.error("SMTP sending failed with result:", result);
      throw new Error(result.message || "SMTP sending failed");
    }

    console.log("RSVP notification sent successfully via SMTP to:", replyToEmail);

    return new Response(JSON.stringify({
      success: true,
      message: "RSVP notification sent successfully"
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Error in notify-rsvp-update function:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
