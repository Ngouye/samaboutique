import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CustomCursor from './components/CustomCursor';
import ErrorBoundary from './components/ErrorBoundary';

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

// Loader Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Chargement rapide...</p>
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

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <CustomCursor />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
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
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
              
              <Route path="/boutique/:shopName" element={<PublicShop />} />
              <Route path="/livreur/:shopName" element={<DriverDashboard />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}
