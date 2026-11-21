import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { ToastProvider, useToast } from './hooks/useToast.jsx';
import { LanguageProvider } from './hooks/useLanguage.jsx';

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ReportIssuePage from './pages/ReportIssuePage.jsx';
import ComplaintDetailPage from './pages/ComplaintDetailPage.jsx';
import CivicMapPage from './pages/CivicMapPage.jsx';
import DepartmentsPage from './pages/DepartmentsPage.jsx';
import MyComplaintsPage from './pages/MyComplaintsPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

/**
 * Protected Route Wrapper for Citizen Pages
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    const returnTo = location.pathname === '/' ? '' : `?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={`/login${returnTo}`} replace />;
  }
  return children;
}

/**
 * Route guard for Citizen reporting: Admins manage complaints and cannot file reports.
 */
function CitizenReportRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    const returnTo = `?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={`/login${returnTo}`} replace />;
  }
  if (user.role === 'admin' || isAdmin) {
    showToast('Admins manage complaints and cannot file reports', 'error');
    return <Navigate to="/admin" replace />;
  }
  return children;
}

/**
 * Friendly access denied card when a non-admin attempts /admin
 */
function AdminAccessOnlyPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-[#FCE8E6] text-[#D93025] flex items-center justify-center mx-auto shadow-xs">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h1 className="text-2xl font-medium font-heading text-[#202124]">
        Admin access only
      </h1>
      <p className="text-sm text-[#5F6368] leading-relaxed">
        This administrative portal is restricted to authorized municipal officers. Citizens can track and report community issues from the civic dashboard.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] transition-colors shadow-sm"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

/**
 * Protected Route Wrapper for Admin Pages
 */
function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (!isAdmin) {
    return <AdminAccessOnlyPage />;
  }
  return children;
}

/**
 * 404 Not Found Page for authenticated users
 */
function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-[#F1F3F4] text-[#5F6368] flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h1 className="text-3xl font-medium font-heading text-[#202124]">
        Page Not Found
      </h1>
      <p className="text-sm text-[#5F6368]">
        The requested civic page could not be located on the platform.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] transition-colors shadow-sm"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

/**
 * Catch-all route: redirects to /login if unauthenticated, shows 404 if authenticated
 */
function CatchAllRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <NotFoundPage />;
}

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAF8]">
        <div className="w-10 h-10 border-4 border-[#E6F4EA] border-t-[#188038] rounded-full animate-spin" />
        <span className="mt-4 text-xs font-medium text-[#5F6368] tracking-wide">
          Loading CivicResolve...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-[#202124] selection:bg-[#E6F4EA] selection:text-[#188038]">
      <Navbar />
      <main id="main-content" className="flex-1 focus:outline-none">
        <ErrorBoundary>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <LandingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/report"
              element={
                <CitizenReportRoute>
                  <ReportIssuePage />
                </CitizenReportRoute>
              }
            />
            <Route
              path="/issue/:id"
              element={
                <ProtectedRoute>
                  <ComplaintDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <CivicMapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments"
              element={
                <ProtectedRoute>
                  <DepartmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-complaints"
              element={
                <ProtectedRoute>
                  <MyComplaintsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/citizen"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<CatchAllRoute />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
