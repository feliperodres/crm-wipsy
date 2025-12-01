import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initializationAttempts = 0;
    const maxAttempts = 3;

    const initializeAuth = async () => {
      try {
        initializationAttempts++;
        
        // Get initial session with retry logic
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Auth session error:', error);
          if (initializationAttempts < maxAttempts) {
            setTimeout(initializeAuth, 1000);
            return;
          }
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.warn('Auth initialization error:', error);
        if (mounted && initializationAttempts < maxAttempts) {
          setTimeout(initializeAuth, 1000);
        } else if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Set up auth state listener with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          try {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          } catch (error) {
            console.warn('Auth state change error:', error);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signOut,
  }), [user, session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};