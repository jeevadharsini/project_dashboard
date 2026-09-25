import { CreateProject } from "./pages/CreateProject";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";
import { PMDashboard } from "./pages/PMDashboard";
import { DeveloperDashboard } from "./pages/DeveloperDashboard";
import { ProjectPage } from "./pages/ProjectPage";
import { Notifications } from "./components/Notifications";

function RoleHome() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "PM") return <PMDashboard />;
  return <DeveloperDashboard />;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <SocketProvider>
      <div className="app-shell">
        <header className="app-header">
          <Link to="/" className="brand">Project Dashboard</Link>
          <div className="header-right">
            <Notifications />
            <span className="user-chip">{user.name} ({user.role})</span>
            <button onClick={logout}>Log out</button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedLayout><RoleHome /></ProtectedLayout>} />
      <Route
  path="/projects/new"
  element={
    <ProtectedLayout>
      <CreateProject />
    </ProtectedLayout>
  }
/>
      <Route path="/projects/:id" element={<ProtectedLayout><ProjectPage /></ProtectedLayout>} />
    </Routes>
  );
}
