import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { LoadingSpinner } from './components/common';

// Pages
import LoginPage from './pages/LoginPage';
import PublicStudentPage from './pages/PublicStudentPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTenants from './pages/admin/Tenants';
import AdminCards from './pages/admin/Cards';
import AdminCardEditor from './pages/admin/CardEditor';

// Tenant Pages
import TenantLayout from './pages/tenant/TenantLayout';
import TenantDashboard from './pages/tenant/Dashboard';
import TenantClasses from './pages/tenant/Classes';
import TenantStudents from './pages/tenant/Students';
import TenantAttendance from './pages/tenant/Attendance';
import TenantExams from './pages/tenant/Exams';

// Protected Route
const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Auth Route
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

const App = () => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f8fafc',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f8fafc',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        } />
        
        <Route path="/student/:id" element={<PublicStudentPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<AdminTenants />} />
          <Route path="cards" element={<AdminCards />} />
          <Route path="cards/edit" element={<AdminCardEditor />} />
        </Route>

        {/* Tenant Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="tenant">
            <TenantLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TenantDashboard />} />
          <Route path="classes" element={<TenantClasses />} />
          <Route path="students" element={<TenantStudents />} />
          <Route path="attendance" element={<TenantAttendance />} />
          <Route path="exams" element={<TenantExams />} />
        </Route>

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-slate-200">404</h1>
              <p className="text-slate-500 mt-3">Page not found</p>
              <a href="/login" className="mt-4 inline-block text-slate-600 hover:text-slate-800 text-sm">
                ← Back to Login
              </a>
            </div>
          </div>
        } />
      </Routes>
    </>
  );
};

export default App;
