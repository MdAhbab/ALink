import * as React from "react";
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import { AppShell } from "./components/shell/AppShell";
import Landing from "./routes/Landing";
import { LoginPage, RegisterPage, OnboardingPage } from "./routes/Auth";
import NotFound from "./routes/NotFound";

// Admin is lazy-loaded so its Recharts dependency stays out of the initial
// bundle for the (vast majority of) non-admin users.
const AdminGate = React.lazy(() => import("./routes/Admin").then((m) => ({ default: m.AdminGate })));
const AdminOverview = React.lazy(() => import("./routes/Admin").then((m) => ({ default: m.AdminOverview })));
const AdminUsers = React.lazy(() => import("./routes/Admin").then((m) => ({ default: m.AdminUsers })));
const AdminVerifications = React.lazy(() => import("./routes/Admin").then((m) => ({ default: m.AdminVerifications })));
const AdminBookings = React.lazy(() => import("./routes/Admin").then((m) => ({ default: m.AdminBookings })));
const AdminReferrals = React.lazy(() => import("./routes/Admin").then((m) => ({ default: m.AdminReferrals })));
const AdminJobs = React.lazy(() => import("./routes/Admin").then((m) => ({ default: m.AdminJobs })));

const Dashboard = React.lazy(() => import("./routes/Dashboard"));
const Profile = React.lazy(() => import("./routes/Profile"));
const Connections = React.lazy(() => import("./routes/Connections"));
const Bookings = React.lazy(() => import("./routes/Bookings"));
const Referrals = React.lazy(() => import("./routes/Referrals"));
const Finder = React.lazy(() => import("./routes/Finder"));
const Inbox = React.lazy(() => import("./routes/Inbox"));
const Settings = React.lazy(() => import("./routes/Settings"));
const Events = React.lazy(() => import("./routes/Events"));
const Mentorship = React.lazy(() => import("./routes/Mentorship"));
const Jobs = React.lazy(() => import("./routes/Jobs"));
const Stories = React.lazy(() => import("./routes/Stories"));
const Achievements = React.lazy(() => import("./routes/Achievements"));
const Calendar = React.lazy(() => import("./routes/Calendar"));
const CoursePlanner = React.lazy(() => import("./routes/CoursePlanner"));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Loading() {
  return (
    <div className="min-h-[40vh] grid place-items-center">
      <div className="size-8 rounded-full border-2 border-muted border-t-[var(--brand-500)] animate-spin" />
    </div>
  );
}

function Router({ children }: { children: React.ReactNode }) {
  const useBrowser =
    typeof window !== "undefined" &&
    window.location &&
    (window.location.protocol === "http:" || window.location.protocol === "https:");
  return useBrowser
    ? <BrowserRouter>{children}</BrowserRouter>
    : <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Router>
        <React.Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route path="/app" element={<Dashboard />} />
              <Route path="/app/profile" element={<Profile />} />
              <Route path="/app/connections" element={<Connections />} />
              <Route path="/app/calendar" element={<Calendar />} />
              <Route path="/app/bookings" element={<Bookings />} />
              <Route path="/app/referrals" element={<Referrals />} />
              <Route path="/app/finder" element={<Finder />} />
              <Route path="/app/inbox" element={<Inbox />} />
              <Route path="/app/settings" element={<Settings />} />
              <Route path="/app/events" element={<Events />} />
              <Route path="/app/mentorship" element={<Mentorship />} />
              <Route path="/app/jobs" element={<Jobs />} />
              <Route path="/app/stories" element={<Stories />} />
              <Route path="/app/achievements" element={<Achievements />} />
              <Route path="/app/course-planner" element={<CoursePlanner />} />

              <Route path="/admin" element={<AdminGate />}>
                <Route index element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="verifications" element={<AdminVerifications />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="referrals" element={<AdminReferrals />} />
                <Route path="jobs" element={<AdminJobs />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}
