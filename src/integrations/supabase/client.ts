
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ftcjcvyyecypjvjhrqxq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Y2pjdnl5ZWN5cGp2amhycXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNjU5MTksImV4cCI6MjA2MTg0MTkxOX0.qQWJM2cwLYYP7VM6bZ6sCh6PEdwTIsJlnn_VLvljJus";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  // Configure fetch to include credentials, with a longer timeout
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (url, options) => {
      // Use a longer timeout for image uploads (5 minutes)
      const fetchOptions = options || {};
      if (fetchOptions.method === 'POST' && 
          typeof url === 'string' && url.includes('storage/')) {
        return fetch(url, {
          ...fetchOptions,
          signal: AbortSignal.timeout(300000), // 5 minute timeout for uploads
        });
      }
      // Default fetch with standard timeout
      return fetch(url, fetchOptions);
    },
  },
});
