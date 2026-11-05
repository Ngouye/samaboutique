import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus';

import { lazyWithRetry } from './utils/lazyWithRetry';
import { Suspense } from 'react';

// Lazy loading sécurisé pour empêcher les erreurs "ChunkLoadError" de Vercel
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const MerchantDashboard = lazyWithRetry(() => import('./pages/MerchantDashboard'));
const PublicShop = lazyWithRetry(() => import('./pages/PublicShop'));
const DriverDashboard = lazyWithRetry(() => import('./pages/DriverDashboard'));
const Landing = lazyWithRetry(() => import('./pages/Landing'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const Directory = lazyWithRetry(() => import('./pages/Directory'));
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'));
const AdminMfaGate = lazyWithRetry(() => import('./components/admin/AdminMfaGate'));

// Écran de chargement aux couleurs de la marque
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7]" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-600/20 border-t-emerald-600" />
      <p className="text-sm font-medium text-slate-500">Chargement…</p>
    </div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  return children;
};

// Admin Route wrapper
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
};

const whenIdle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));

// Changement de page : retour en haut, fondu doux (sauf au premier affichage, pour ne pas
// retarder l'accueil), et préchargement des pages Connexion / Inscription depuis l'accueil.
function PageTransition({ children }) {
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    if (!firstRender.current) window.scrollTo(0, 0);
    firstRender.current = false;
  }, [pathname]);

  useEffect(() => {
    if (window.location.pathname === '/') whenIdle(() => { import('./pages/Login'); import('./pages/Register'); });
  }, []);

  return (
    // Fondu d'opacité seulement : une transformation casserait les éléments fixes des pages.
    <motion.div key={pathname} initial={firstRender.current ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ErrorBoundary>
          <NetworkStatus />
          <PageTransition>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/boutiques" element={<Directory />} />
                <Route path="/nouveau-mot-de-passe" element={<ResetPassword />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <MerchantDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminMfaGate>
                        <AdminDashboard />
                      </AdminMfaGate>
                    </AdminRoute>
                  }
                />

                <Route path="/boutique/:shopName" element={<PublicShop />} />
                <Route path="/livreur/:shopName" element={<DriverDashboard />} />
              </Routes>
            </Suspense>
          </PageTransition>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}
