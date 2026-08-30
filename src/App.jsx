import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CustomCursor from './components/CustomCursor';

// Pages - Lazy Loaded for Performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const MerchantDashboard = lazy(() => import('./pages/MerchantDashboard'));
const PublicShop = lazy(() => import('./pages/PublicShop'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const Landing = lazy(() => import('./pages/Landing'));

// Loader Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Chargement...</p>
    </div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <CustomCursor />
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
            
            <Route path="/boutique/:shopName" element={<PublicShop />} />
            <Route path="/livreur/:shopName" element={<DriverDashboard />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
