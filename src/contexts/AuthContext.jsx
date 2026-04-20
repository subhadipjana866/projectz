import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);


  const signUp = async (email, password, name, role) => {


    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
          role: role,
          email: email,
        }
      }
    })
    // console.log("data1", data);


    if (error) throw error;
    return data;
  };

  const verifyOtp = async (email, token) => {

    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  };

  const resendEmailConfirmation = async (email) => {

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })

  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding-role`,
      },
    });

    if (error) throw error;
    return data;
  };
  const registerWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding-role`,
      },
    });

    if (error) throw error;
    return data;
  };

  const signInWithX = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/onboarding-role`,
      },
    });

    if (error) throw error;
    return data;
  };

  const signInWithDiscord = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/onboarding-role`,
      },
    });

    if (error) throw error;
    return data;
  };

  const signInWithLinkedin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin',
      options: {
        redirectTo: `${window.location.origin}/onboarding-role`,
      },
    });

    if (error) throw error;
    return data;
  };

  const clearSession = async () => {
    try {
      // Clear sessionStorage registration data
      sessionStorage.removeItem('registrationData');

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear local auth state
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Error clearing session:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendEmailConfirmation,
    verifyOtp,
    registerWithGoogle,
    signInWithGoogle,
    signInWithX,
    signInWithDiscord,
    signInWithLinkedin,
    clearSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
