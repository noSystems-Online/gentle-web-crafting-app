
import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient, SupabaseClient, Session, User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

// Types
type AuthContextType = {
  user: User | null;
  session: Session | null;
  supabase: SupabaseClient;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  subscription: SubscriptionStatus | null;
  checkSubscription: () => Promise<void>;
};

export type SubscriptionStatus = {
  subscribed: boolean;
  plan: string | null;
  currentPeriodEnd: string | null;
  status: string | null;
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "https://your-supabase-url.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "your-supabase-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          checkSubscription();
        } else {
          setSubscription(null);
        }

        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        checkSubscription();
      }

      setLoading(false);
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  // Check user's subscription status
  const checkSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching subscription:", error);
        setSubscription(null);
        return;
      }

      if (data) {
        setSubscription({
          subscribed: data.status === "active",
          plan: data.plan,
          currentPeriodEnd: data.current_period_end,
          status: data.status,
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error in subscription check:", error);
      setSubscription(null);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Success!",
        description: "Check your email for the confirmation link.",
      });

      navigate("/login");
    } catch (error: any) {
      console.error("Error during sign up:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error during sign in:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setSubscription(null);
      navigate("/");
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error("Error during sign out:", error.message);
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        supabase,
        signUp,
        signIn,
        signOut,
        loading,
        subscription,
        checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
