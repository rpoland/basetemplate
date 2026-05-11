import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import AddUserPage from './pages/AddUserPage.jsx';
import ManageUsersPage from './pages/ManageUsersPage.jsx';
import EditUserPage from './pages/EditUserPage.jsx';
import ScopesPage from './pages/ScopesPage.jsx';
import AddScopePage from './pages/AddScopePage.jsx';

function ProtectedRoute({ children, permission }) {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/dashboard" replace />;

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/register"  element={<RegisterPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/users"        element={<ProtectedRoute permission="users:"><UsersPage /></ProtectedRoute>} />
          <Route path="/users/adduser" element={<ProtectedRoute permission="users:write"><AddUserPage /></ProtectedRoute>} />
          <Route path="/users/manage"      element={<ProtectedRoute permission="users:"><ManageUsersPage /></ProtectedRoute>} />
          <Route path="/users/manage/user" element={<ProtectedRoute permission="users:write"><EditUserPage /></ProtectedRoute>} />
          <Route path="/scopes"            element={<ProtectedRoute permission="scope:read"><ScopesPage /></ProtectedRoute>} />
          <Route path="/scopes/add"        element={<ProtectedRoute permission="scope:write"><AddScopePage /></ProtectedRoute>} />
          <Route path="*"          element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
