import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GroupProvider } from "./context/GroupContext";
import { Home } from "./pages/Home";
import { Quiz } from "./pages/Quiz";
import { Admin } from "./pages/Admin";
import { EmailLogs } from "./pages/EmailLogs";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { LandingPage } from "./pages/LandingPage";
import { Layout } from "./components/Layout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function GroupRoutes() {
  return (
    <GroupProvider>
      <Layout />
    </GroupProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/:group"
            element={
              <ProtectedRoute>
                <GroupRoutes />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="quiz" element={<Quiz />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="email-logs"
              element={
                <AdminRoute>
                  <EmailLogs />
                </AdminRoute>
              }
            />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
