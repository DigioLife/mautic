import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import ContactsPage from './pages/contacts/ContactsPage';
import EmailCampaignsPage from './pages/emails/EmailCampaignsPage';
import WorkflowsPage from './pages/workflows/WorkflowsPage';
import MasterAdminLayout from './layouts/MasterAdminLayout';
import MasterDashboardPage from './pages/master/MasterDashboardPage';

function App() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const isMasterAdmin = Boolean(user?.isMasterAdmin);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />

      {/* Always reachable regardless of auth state — these are entered via
          emailed links, and a stale session token in localStorage shouldn't
          block using them. */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes — tenant users only, master admins belong in /master */}
      <Route
        path="/dashboard"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" />
          ) : isMasterAdmin ? (
            <Navigate to="/master" />
          ) : (
            <DashboardLayout />
          )
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="emails" element={<EmailCampaignsPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
      </Route>

      {/* Master Admin routes — gated by role, not just auth. Server-side
          endpoints already enforce this via requireMasterAdmin; this guard
          only stops a regular tenant user from landing on the admin shell. */}
      <Route
        path="/master"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" />
          ) : isMasterAdmin ? (
            <MasterAdminLayout />
          ) : (
            <Navigate to="/dashboard" />
          )
        }
      >
        <Route index element={<MasterDashboardPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={isMasterAdmin ? '/master' : '/dashboard'} />} />
      <Route path="*" element={<Navigate to={isMasterAdmin ? '/master' : '/dashboard'} />} />
    </Routes>
  );
}

export default App;
