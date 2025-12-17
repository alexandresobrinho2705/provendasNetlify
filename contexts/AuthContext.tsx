
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { User } from '../types';
import { authService, mapSupabaseUser } from '../services/authService';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null); // Ref to track current user without triggering renders for comparison

  // Helper to fetch custom permissions AND owner_id from user_profiles
  const enhanceUserWithProfile = async (baseUser: User): Promise<User> => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('allowed_routes, owner_id')
        .eq('user_id', baseUser.id)
        .maybeSingle();
      
      const updates: Partial<User> = {};
      if (data) {
         if (data.allowed_routes) updates.allowed_routes = data.allowed_routes;
         updates.owner_id = data.owner_id || baseUser.id;
      }
      
      return { ...baseUser, ...updates };
    } catch (err) {
      console.error("Failed to fetch user permissions", err);
    }
    return baseUser;
  };

  // Helper to stabilize state updates
  const handleUserUpdate = (newUser: User | null) => {
    const currentStr = JSON.stringify(userRef.current);
    const newStr = JSON.stringify(newUser);

    if (currentStr !== newStr) {
      userRef.current = newUser;
      setUser(newUser);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Verificar sessão inicial
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const mapped = mapSupabaseUser(session.user);
          if (mapped) {
             const enhanced = await enhanceUserWithProfile(mapped);
             if (mounted) handleUserUpdate(enhanced);
          }
        } else {
           if (mounted) handleUserUpdate(null);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkSession();

    // 2. Escutar mudanças de estado (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        // Ignora eventos que não alteram dados fundamentais se a sessão for a mesma
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (session?.user) {
                const mapped = mapSupabaseUser(session.user);
                if (mapped) {
                    const enhanced = await enhanceUserWithProfile(mapped);
                    if (mounted) handleUserUpdate(enhanced);
                }
            }
        } else if (event === 'SIGNED_OUT') {
            if (mounted) handleUserUpdate(null);
        }
      } catch (err) {
        console.error("Erro no AuthStateChange:", err);
      } finally {
        // Ensure loading is false after auth checks
        if (mounted) setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const baseUser = await authService.signIn(email, pass);
      const enhanced = await enhanceUserWithProfile(baseUser);
      handleUserUpdate(enhanced);
    } catch (error) {
      // Don't clear user here, just stop loading and throw
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      handleUserUpdate(null);
    } catch (error) {
      console.error("Erro ao sair", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
