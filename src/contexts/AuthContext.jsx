import React, { createContext, useContext, useEffect, useState } from 'react';
import { setMonitoringUser } from '../lib/monitoring';

// La bibliothèque Supabase (≈ 200 Ko) est chargée à part : la page d'accueil s'affiche
// sans l'attendre, et la session est vérifiée en arrière-plan.
const getSupabase = () => import('../supabaseClient').then((m) => m.supabase);

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [merchant, setMerchant] = useState(null);
  // Rôle admin vérifié par la base (table platform_admins), jamais par une adresse email côté navigateur.
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMonitoringUser(user?.id); }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    let subscription;

    getSupabase().then((supabase) => {
      if (cancelled) return;

      // Check active session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchMerchantProfile(session.user.id);
        } else {
          setLoading(false);
        }
      });

      // Listen for auth changes
      ({ data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchMerchantProfile(session.user.id);
        } else {
          setMerchant(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }));
    }).catch((err) => {
      // Fichier introuvable (nouvelle version mise en ligne entre-temps) ou réseau coupé
      console.error('Session indisponible :', err);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  // Fiche complète du marchand connecté (les colonnes privées ne sont lisibles que par lui,
  // via get_my_merchant). Repli sur l'ancienne lecture tant que security_fixes_3.sql n'est pas installé.
  const loadMerchant = async (userId) => {
    const supabase = await getSupabase();
    const viaRpc = await supabase.rpc('get_my_merchant');
    if (!viaRpc.error) return viaRpc.data;
    const direct = await supabase.from('merchants').select('*').eq('id', userId).single();
    if (direct.error) console.error('Profil marchand introuvable :', direct.error.message);
    return direct.data || null;
  };

  // Compte administrateur (l'accès aux données exige en plus la double authentification).
  const loadAdminFlag = async () => {
    const supabase = await getSupabase();
    const account = await supabase.rpc('is_platform_admin_account');
    if (!account.error) return account.data === true;
    const legacy = await supabase.rpc('is_platform_admin');
    return legacy.data === true;
  };

  const fetchMerchantProfile = async (userId) => {
    try {
      const [profile, admin] = await Promise.all([loadMerchant(userId), loadAdminFlag()]);
      setIsAdmin(admin);
      setMerchant(profile);
    } finally {
      setLoading(false);
    }
  };

  const refreshMerchant = async () => {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getUser();
    if (data?.user) setMerchant(await loadMerchant(data.user.id));
  };

  // `captchaToken` : jeton Turnstile, requis seulement si le captcha est activé dans Supabase.
  const login = async (email, password, captchaToken) => {
    const supabase = await getSupabase();
    return supabase.auth.signInWithPassword({ email, password, ...(captchaToken ? { options: { captchaToken } } : {}) });
  };

  // `location` (facultatif) : position de la boutique partagée par le marchand,
  // enregistrée côté serveur par le trigger on_auth_user_created_location.
  const register = async (email, password, shopName, phoneNumber, location = null, captchaToken = '') => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(captchaToken ? { captchaToken } : {}),
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

  // Déconnexion de cet appareil, ou de tous les appareils du compte ({ everywhere: true }).
  // Même sans réseau, la session est retirée de cet appareil ; seule la fermeture des autres peut échouer.
  const logout = async (options) => {
    const supabase = await getSupabase();
    const everywhere = options?.everywhere === true;
    const { error } = await supabase.auth.signOut({ scope: everywhere ? 'global' : 'local' });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, merchant, isAdmin, login, register, logout, loading, refreshMerchant }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
