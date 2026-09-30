import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [merchant, setMerchant] = useState(null);
  // Rôle admin vérifié par la base (table platform_admins), jamais par une adresse email côté navigateur.
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchMerchantProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchMerchantProfile(session.user.id);
      } else {
        setMerchant(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMerchantProfile = async (userId) => {
    try {
      const [{ data, error }, { data: adminFlag }] = await Promise.all([
        supabase.from('merchants').select('*').eq('id', userId).single(),
        supabase.rpc('is_platform_admin'),
      ]);
      setIsAdmin(adminFlag === true);

      if (error) {
        console.error("Error fetching merchant profile:", error);
      } else {
        setMerchant(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  // `location` (facultatif) : position de la boutique partagée par le marchand,
  // enregistrée côté serveur par le trigger on_auth_user_created_location.
  const register = async (email, password, shopName, phoneNumber, location = null) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          shop_name: shopName,
          phone_number: phoneNumber,
          ...(location ? { location: { lat: location.lat, lng: location.lng, accuracy: Math.round(location.accuracy || 0), public: !!location.public } } : {})
        }
      }
    });

    if (error) throw error;
    // Le profil sera inséré automatiquement côté serveur via un Trigger
    return data;
  };

  const logout = async () => {
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, merchant, isAdmin, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
