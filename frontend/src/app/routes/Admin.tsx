import * as React from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { apiRequest, getAuthToken } from "../lib/api";
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip, BarChart, Bar, CartesianGrid, Cell, PieChart, Pie, Legend } from "recharts";
import { useAuth } from "../lib/auth";
import { Check, X, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function AdminGate() {
  const { user } = useAuth();
  const nav = useNavigate();
  React.useEffect(() => { if (user && user.role !== "admin") nav("/app", { replace: true }); }, [user]);
  if (!user || user.role !== "admin") return <Forbidden />;
  return <AdminLayout />;
}

function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl">Admin Console</h1>
          <p className="text-muted-foreground">Trust, safety, and growth — at a glance.</p>
        </div>
        <Badge variant="outline" className="rounded-full">Production</Badge>
      </div>

      <nav className="flex gap-2 overflow-x-auto">
        {[
          { to: "/admin", label: "Overview", end: true },
          { to: "/admin/users", label: "Users" },
          { to: "/admin/verifications", label: "Verifications" },
          { to: "/admin/bookings", label: "Bookings" },
          { to: "/admin/referrals", label: "Referrals" },
          { to: "/admin/jobs", label: "Job posts" },
        ].map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => `px-3.5 py-1.5 rounded-full text-sm transition ${isActive ? "bg-foreground text-background" : "hover:bg-muted"}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Outlet />
      </motion.div>
    </div>
  );
}

export function AdminOverview() {
  const [adminStats, setAdminStats] = React.useState<any>({ users: 0, alumni: 0, students: 0, verifications: 0, weekly: [] });
  const [verificationQueue, setVerificationQueue] = React.useState<any[]>([]);
  const [jobPosts, setJobPosts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    Promise.all([
      apiRequest<any>("/admin/stats", { token }).then(setAdminStats).catch(() => {}),
      apiRequest<any[]>("/verifications", { token }).then(setVerificationQueue).catch(() => {}),
      apiRequest<any[]>("/jobs?status=pending", { token }).then(setJobPosts).catch(() => {}),
    ]);
  }, []);

  const cards = [
    { l: "Users", v: adminStats.users.toLocaleString() },
    { l: "Alumni", v: adminStats.alumni.toLocaleString() },
    { l: "Students", v: adminStats.students.toLocaleString() },
    { l: "Verifications pending", v: adminStats.verifications },
  ];
  const roleData = [
    { name: "Alumni", value: adminStats.alumni, fill: "var(--brand-500)" },
    { name: "Students", value: adminStats.students, fill: "var(--amber)" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.l}><CardContent className="p-5">
            <div className="text-xs text-muted-foreground">{c.l}</div>
            <div className="font-serif text-3xl mt-1">{c.v}</div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2"><CardContent className="p-5">
          <h3 className="font-serif text-2xl">Signups & sessions</h3>
          <div className="h-64 mt-3">
            <ResponsiveContainer>
              <LineChart data={adminStats.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Line type="monotone" dataKey="signups" stroke="var(--brand-500)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="sessions" stroke="var(--amber)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <h3 className="font-serif text-2xl">Composition</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={roleData} dataKey="value" innerRadius={50} outerRadius={80}>
                  {roleData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl">Needs attention</h3>
          <Badge variant="outline" className="rounded-full">{verificationQueue.length + jobPosts.filter(j => j.status !== "live").length} items</Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2"><ShieldAlert className="size-4 text-[var(--amber)]" /> Verifications</div>
            <p className="text-sm text-muted-foreground mt-1">{verificationQueue.length} pending requests</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2"><AlertTriangle className="size-4 text-[var(--amber)]" /> Job posts</div>
            <p className="text-sm text-muted-foreground mt-1">{jobPosts.filter(j => j.status !== "live").length} awaiting review</p>
          </div>
        </div>
      </CardContent></Card>
    </div>
  );
}

export function AdminUsers() {
  const [people, setPeople] = React.useState<any[]>([]);
  const fetchUsers = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<any[]>("/admin/users", { token });
      setPeople(data);
    } catch {}
  }, []);
  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>University</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {people.map(p => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-8"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name?.[0]}</AvatarFallback></Avatar>
                  <div>
                    <div className="text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.title}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="capitalize">{p.role}</TableCell>
              <TableCell>{p.university}</TableCell>
              <TableCell>{p.verified ? <Badge>Verified</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem className="text-[var(--rose)]" onClick={async () => {
                      if (!confirm(`Are you sure you want to delete ${p.name}?`)) return;
                      const token = getAuthToken();
                      if (!token) return;
                      try {
                        await apiRequest(`/admin/users/${p.id}`, { method: "DELETE", token });
                        toast.success(`Deleted ${p.name}`);
                        fetchUsers();
                      } catch (err: any) {
                        toast.error("Failed to delete user", { description: err.message });
                      }
                    }}>Delete User</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

export function AdminVerifications() {
  const [verificationQueue, setVerificationQueue] = React.useState<any[]>([]);
  const fetchQueue = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<any[]>("/verifications", { token });
      setVerificationQueue(data);
    } catch {}
  }, []);
  React.useEffect(() => { fetchQueue(); }, [fetchQueue]);

  return (
    <div className="space-y-3">
      {verificationQueue.map(v => (
        <Card key={v.id}><CardContent className="p-4 flex items-center gap-4">
          <ShieldCheck className="size-7 text-[var(--brand-600)]" />
          <div className="flex-1 min-w-0">
            <div className="text-sm">{v.name} <span className="text-muted-foreground">· {v.role}</span></div>
            <div className="text-xs text-muted-foreground">{v.university} · submitted {v.submittedAt} ago</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={async () => {
              try {
                await apiRequest(`/verifications/${v.id}/reject`, { method: "POST", token: getAuthToken() || undefined });
                toast(`Rejected ${v.name}`);
                fetchQueue();
              } catch (err: any) {
                toast.error("Failed", { description: err.message });
              }
            }}><X className="size-4" /> Reject</Button>
            <Button size="sm" onClick={async () => {
              try {
                await apiRequest(`/verifications/${v.id}/approve`, { method: "POST", token: getAuthToken() || undefined });
                toast.success(`${v.name} approved`);
                fetchQueue();
              } catch (err: any) {
                toast.error("Failed", { description: err.message });
              }
            }}><Check className="size-4" /> Approve</Button>
          </div>
        </CardContent></Card>
      ))}
      {verificationQueue.length === 0 && <div className="text-muted-foreground text-center py-10">No pending verifications.</div>}
    </div>
  );
}

export function AdminBookings() {
  const [bookings, setBookings] = React.useState<any[]>([]);
  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    apiRequest<any[]>("/bookings", { token }).then(setBookings).catch(() => {});
  }, []);
  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Topic</TableHead><TableHead>With</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {bookings.map(b => (
            <TableRow key={b.id}>
              <TableCell>{b.topic}</TableCell>
              <TableCell>{b.with?.name}</TableCell>
              <TableCell>{b.date} {b.time}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{b.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

export function AdminReferrals() {
  const [referrals, setReferrals] = React.useState<any[]>([]);
  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    apiRequest<any[]>("/referrals", { token }).then(setReferrals).catch(() => {});
  }, []);
  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Company</TableHead><TableHead>Referrer</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {referrals.map(r => (
            <TableRow key={r.id}>
              <TableCell>{r.role}</TableCell>
              <TableCell>{r.company}</TableCell>
              <TableCell>{r.referrer?.name ?? "—"}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

export function AdminJobs() {
  const [jobPosts, setJobPosts] = React.useState<any[]>([]);
  const fetchJobs = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<any[]>("/jobs?status=pending", { token }); // Only pending logic for now to keep simple
      setJobPosts(data);
    } catch {}
  }, []);
  React.useEffect(() => { fetchJobs(); }, [fetchJobs]);

  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Company</TableHead><TableHead>Posted by</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {jobPosts.map(j => (
            <TableRow key={j.id}>
              <TableCell>{j.role}</TableCell>
              <TableCell>{j.company}</TableCell>
              <TableCell>{j.postedBy?.name || "Unknown"}</TableCell>
              <TableCell><Badge variant={j.status === "flagged" ? "destructive" : "outline"} className="capitalize">{j.status}</Badge></TableCell>
              <TableCell className="text-right">
                {j.status !== "live" ? (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try {
                        await apiRequest(`/jobs/${j.id}/flag`, { method: "POST", token: getAuthToken() || undefined });
                        toast(`Removed ${j.role}`);
                        fetchJobs();
                      } catch (err: any) {
                        toast.error("Failed", { description: err.message });
                      }
                    }}>Remove</Button>
                    <Button size="sm" onClick={async () => {
                      try {
                        await apiRequest(`/jobs/${j.id}/approve`, { method: "POST", token: getAuthToken() || undefined });
                        toast.success(`Approved ${j.role}`);
                        fetchJobs();
                      } catch (err: any) {
                        toast.error("Failed", { description: err.message });
                      }
                    }}>Approve</Button>
                  </div>
                ) : <Button size="sm" variant="ghost">Open</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function Forbidden() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="text-center">
        <ShieldAlert className="size-12 mx-auto text-[var(--amber)]" />
        <h2 className="font-serif text-3xl mt-3">Admins only</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    </div>
  );
}
