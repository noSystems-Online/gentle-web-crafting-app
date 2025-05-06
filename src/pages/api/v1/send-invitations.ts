
// This file acts as a proxy to the Supabase edge function
// It's not actually used directly, but documents the expected API interface

export interface SendInvitationRequest {
  invitationId: string;
  invitationTitle?: string;
  userId?: string;
  imageDataUrl?: string;
}

export interface SendInvitationResponse {
  success: boolean;
  results?: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    details: any[];
  };
  error?: string;
}

// The actual implementation is handled by the Supabase edge function
// This is just for documentation purposes
