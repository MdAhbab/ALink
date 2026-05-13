import { useAuth } from "../lib/auth";
import StudentDashboard from "./dashboards/StudentDashboard";
import AlumniDashboard from "./dashboards/AlumniDashboard";
import AdminDashboardView from "./dashboards/AdminDashboardView";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin") return <AdminDashboardView />;
  if (user.role === "alumni") return <AlumniDashboard />;
  return <StudentDashboard />;
}
