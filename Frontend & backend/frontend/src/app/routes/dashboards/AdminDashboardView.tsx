import * as React from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { apiRequest, getAuthToken } from "../../lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { AlertTriangle, ArrowUpRight, ShieldAlert, ShieldCheck, Activity, Server, Users, Briefcase } from "lucide-react";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function AdminDashboardView() {
  const [adminStats, setAdminStats] = React.useState<any>({ users: 0, alumni: 0, students: 0, bookings: 0, referrals: 0, weekly: [] });
  const [verificationQueue, setVerificationQueue] = React.useState<any[]>([]);
  const [jobPosts, setJobPosts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    Promise.all([
      apiRequest<any>("/admin/stats", { token }).then(setAdminStats).catch(() => {}),
      apiRequest<any[]>("/verifications", { token }).then(setVerificationQueue).catch(() => {}),
      apiRequest<any[]>("/jobs?status=pending", { token }).then(setJobPosts).catch(() => {}), // Assuming pending jobs
    ]);
  }, []);

  const roleData = [
    { name: "Alumni", value: adminStats.alumni, fill: "var(--brand-500)" },
    { name: "Students", value: adminStats.students, fill: "var(--amber)" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Badge variant="outline" className="rounded-full"><ShieldCheck className="size-3" /> Operator console</Badge>
          <h1 className="font-serif text-4xl md:text-5xl mt-2">Trust & growth, at a glance.</h1>
          <p className="text-muted-foreground">26 verifications pending · 1 flagged job · 0 incidents today.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/verifications"><Button className="gap-2">Verification queue <ArrowUpRight className="size-4" /></Button></Link>
          <Link to="/admin/jobs"><Button variant="outline">Moderate jobs</Button></Link>
        </div>
      </motion.div>

      {/* Live status strip */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
        {[
          { l: "Uptime", v: "99.98%", i: Server, c: "var(--mint)" },
          { l: "Active now", v: "1,247", i: Activity, c: "var(--brand-500)" },
          { l: "Reports today", v: "3", i: AlertTriangle, c: "var(--amber)" },
          { l: "New today", v: "82", i: Users, c: "var(--rose)" },
        ].map(s => (
          <div key={s.l} className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl grid place-items-center" style={{ background: `${s.c}22` }}>
              <s.i className="size-4" style={{ color: s.c }} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
              <div className="font-serif text-2xl leading-tight">{s.v}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Stat tiles */}
      <motion.div variants={item} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Total users", v: adminStats.users.toLocaleString(), sub: "+4.2% wow" },
          { l: "Alumni", v: adminStats.alumni.toLocaleString(), sub: "39.8% of base" },
          { l: "Sessions / wk", v: adminStats.bookings.toLocaleString(), sub: "+12% wow" },
          { l: "Referrals / wk", v: adminStats.referrals.toLocaleString(), sub: "+5% wow" },
        ].map(s => (
          <Card key={s.l}><CardContent className="p-5">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="font-serif text-3xl mt-1">{s.v}</div>
            <div className="text-[11px] text-muted-foreground">{s.sub}</div>
          </CardContent></Card>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div variants={item} className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
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
        </motion.div>
        <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-serif text-2xl">Role mix</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={roleData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {roleData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Queue + flagged */}
      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div variants={item} className="rounded-2xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div><h3 className="font-serif text-2xl">Verification queue</h3><p className="text-sm text-muted-foreground">{verificationQueue.length} pending</p></div>
            <Link to="/admin/verifications"><Button variant="ghost" size="sm">Open queue</Button></Link>
          </div>
          <div className="divide-y divide-border">
            {verificationQueue.map(v => (
              <div key={v.id} className="p-4 flex items-center gap-3">
                <ShieldAlert className="size-5 text-[var(--amber)]" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{v.name} <span className="text-muted-foreground">· {v.role}</span></div>
                  <div className="text-xs text-muted-foreground">{v.university} · {v.submittedAt}</div>
                </div>
                <Button size="sm" variant="outline">Review</Button>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div><h3 className="font-serif text-2xl">Moderation</h3><p className="text-sm text-muted-foreground">Jobs & content awaiting review</p></div>
            <Link to="/admin/jobs"><Button variant="ghost" size="sm">Open</Button></Link>
          </div>
          <div className="divide-y divide-border">
            {jobPosts.map(j => (
              <div key={j.id} className="p-4 flex items-center gap-3">
                <Briefcase className="size-5 text-[var(--brand-600)]" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{j.role} <span className="text-muted-foreground">@ {j.company}</span></div>
                  <div className="text-xs text-muted-foreground">Posted by {j.postedBy}</div>
                </div>
                <Badge variant={j.status === "live" ? "secondary" : j.status === "flagged" ? "destructive" : "outline"} className="capitalize">{j.status}</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
