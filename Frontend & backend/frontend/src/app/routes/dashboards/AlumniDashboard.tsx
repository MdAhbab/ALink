import * as React from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useAuth } from "../../lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { apiRequest, getAuthToken } from "../../lib/api";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";
import { Award, Calendar, Compass, Heart, Sparkles, TrendingUp, Users, ChevronRight, BellRing, Trophy } from "lucide-react";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const impactData = [
  { w: "W1", hours: 2 }, { w: "W2", hours: 3 }, { w: "W3", hours: 4 },
  { w: "W4", hours: 3 }, { w: "W5", hours: 5 }, { w: "W6", hours: 7 },
  { w: "W7", hours: 6 }, { w: "W8", hours: 8 }, { w: "W9", hours: 7 },
  { w: "W10", hours: 9 }, { w: "W11", hours: 10 }, { w: "W12", hours: 11 },
];

export default function AlumniDashboard() {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = React.useState<any[]>([]);
  const [people, setPeople] = React.useState<any[]>([]);
  const [connections, setConnections] = React.useState<any[]>([]);
  const [referrals, setReferrals] = React.useState<any[]>([]);
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [mentorPrograms, setMentorPrograms] = React.useState<any[]>([]);
  const [alumniLeaderboard, setAlumniLeaderboard] = React.useState<any[]>([]);

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    Promise.all([
      apiRequest<any[]>("/connections/requests", { token }).then(setIncomingRequests).catch(() => {}),
      apiRequest<any[]>("/users", { token }).then((data) => {
        setPeople(data);
        setAlumniLeaderboard(data.filter(u => u.role === "alumni").slice(0, 3));
      }).catch(() => {}),
      apiRequest<any[]>("/connections", { token }).then(setConnections).catch(() => {}),
      apiRequest<any[]>("/referrals", { token }).then(setReferrals).catch(() => {}),
      apiRequest<any[]>("/bookings", { token }).then(setBookings).catch(() => {}),
      apiRequest<any[]>("/mentorship/programs", { token }).then(setMentorPrograms).catch(() => {}),
    ]);
  }, []);
  const heroRef = React.useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const shineY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const shineX = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 25]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Hero — give back energy */}
      <motion.div ref={heroRef} variants={item} className="relative overflow-hidden rounded-3xl border border-border p-6 md:p-8 text-white" style={{ background: "linear-gradient(135deg, #361F8C 0%, #7C5CFF 55%, #F5B461 110%)" }}>
        <motion.div aria-hidden style={{ y: shineY, x: shineX }} className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(255,255,255,0.3),transparent)]" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <Badge variant="secondary" className="rounded-full bg-white/15 text-white border-white/20"><Heart className="size-3" /> Top 5% mentor this month</Badge>
            <h1 className="font-serif text-4xl md:text-5xl mt-3">Hi {user!.name.split(" ")[0]}, <span className="italic">2 students need your wisdom.</span></h1>
            <p className="text-white/85 mt-2 max-w-xl">You've given <strong>36 hours</strong> this year. That's 14 students closer to their dream career.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/app/connections?tab=requests"><Button className="bg-white text-[#0B0D1F] hover:bg-white/90 gap-2"><BellRing className="size-4" /> Review requests · {incomingRequests.length}</Button></Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm border border-white/20">
              <Switch defaultChecked />Open to mentor
            </div>
          </div>
        </div>
      </motion.div>

      {/* Impact stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Mentees", v: connections.length, sub: "Total connections" },
          { l: "Hours given", v: bookings.length, sub: "Total sessions" },
          { l: "Referrals made", v: referrals.length, sub: "Total referred" },
          { l: "Impact score", v: bookings.length * 10, sub: "From mentoring" },
        ].map(s => (
          <Card key={s.l}><CardContent className="p-5">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="font-serif text-3xl mt-1 inline-flex items-center gap-1.5">{s.v}<TrendingUp className="size-3 text-[var(--success,#2BB673)]" /></div>
            <div className="text-[11px] text-muted-foreground mt-1">{s.sub}</div>
          </CardContent></Card>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Impact chart */}
        <motion.div variants={item} className="lg:col-span-2 rounded-2xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div><h3 className="font-serif text-2xl">Your mentorship hours</h3><p className="text-sm text-muted-foreground">12-week rolling impact</p></div>
            <Badge variant="outline" className="rounded-full"><Sparkles className="size-3" /> Trending up</Badge>
          </div>
          <div className="p-5 h-64">
            <ResponsiveContainer>
              <AreaChart data={impactData}>
                <defs>
                  <linearGradient id="alumniHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--brand-500)" stopOpacity="0.6" />
                    <stop offset="1" stopColor="var(--brand-500)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="w" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Area type="monotone" dataKey="hours" stroke="var(--brand-500)" strokeWidth={2.5} fill="url(#alumniHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Impact ring */}
        <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-serif text-2xl">Yearly goal</h3>
          <p className="text-sm text-muted-foreground">50 mentorship hours</p>
          <div className="h-56 mt-2">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "hours", value: 72, fill: "var(--brand-500)" }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-32 mb-12 relative z-10">
            <div className="font-serif text-4xl">36<span className="text-muted-foreground text-lg">/50</span></div>
            <div className="text-xs text-muted-foreground">hours given · 72% there</div>
          </div>
        </motion.div>
      </div>

      {/* Pending requests + leaderboard */}
      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div variants={item} className="lg:col-span-2 rounded-2xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-serif text-2xl">Students waiting on you</h3>
            <Link to="/app/connections?tab=requests"><Button variant="ghost" size="sm">All <ChevronRight className="size-3.5" /></Button></Link>
          </div>
          <div className="divide-y divide-border">
            {incomingRequests.length > 0 ? incomingRequests.map(r => (
              <div key={r.id} className="p-4 flex items-start gap-3 hover:bg-muted/40">
                <Avatar className="size-10"><AvatarImage src={r.from.avatar} /><AvatarFallback>{r.from.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{r.from.name} <span className="text-muted-foreground">· {r.from.title}</span></div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">"{r.message}"</p>
                  <div className="text-[10px] text-muted-foreground mt-1">{r.at}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">Skip</Button>
                  <Button size="sm">Accept</Button>
                </div>
              </div>
            )) : <div className="p-5 text-sm text-muted-foreground">No pending requests right now.</div>}
            {/* Suggested mentees */}
            <div className="p-4 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">Suggested mentees from {user!.university}</div>
              <div className="grid grid-cols-3 gap-2">
                {people.filter(p => p.role === "student").slice(0, 3).map(p => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-2.5 text-center">
                    <Avatar className="size-10 mx-auto"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                    <div className="text-xs mt-1.5 truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.major}</div>
                    <Button size="sm" variant="outline" className="h-6 px-2 mt-1.5 text-[10px]">Invite</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">Mentor leaderboard</h3>
            <Trophy className="size-4 text-[var(--amber)]" />
          </div>
          <div className="mt-3 space-y-2">
            {alumniLeaderboard.length > 0 ? alumniLeaderboard.map((a, i) => (
              <div key={a.id} className={`flex items-center gap-2.5 p-2 rounded-xl ${i === 0 ? "bg-gradient-to-r from-[color:var(--amber)]/15 to-transparent" : ""}`}>
                <div className="size-6 grid place-items-center font-mono text-xs text-muted-foreground">#{i+1}</div>
                <Avatar className="size-8"><AvatarImage src={a.avatar} /><AvatarFallback>{a.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><div className="text-sm truncate">{a.name}</div><div className="text-[10px] text-muted-foreground truncate">{a.company}</div></div>
                <div className="text-sm font-mono">{a.score ?? 0}</div>
              </div>
            )) : <div className="text-sm text-muted-foreground">No data available.</div>}
          </div>
        </motion.div>
      </div>

      {/* Your programs */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div><h3 className="font-serif text-2xl">Your programs</h3><p className="text-sm text-muted-foreground">Office hours and mentor cohorts</p></div>
          <Link to="/app/mentorship"><Button variant="ghost" size="sm">Manage <ChevronRight className="size-3.5" /></Button></Link>
        </div>
        <div className="p-4 grid md:grid-cols-3 gap-3">
          {mentorPrograms.slice(0,3).length > 0 ? mentorPrograms.slice(0,3).map(p => (
            <motion.div key={p.id} whileHover={{ y: -3 }} className="rounded-xl border border-border p-4">
              <Badge variant="outline" className="rounded-full">{p.duration}</Badge>
              <div className="font-serif text-lg mt-2">{p.title}</div>
              <div className="text-xs text-muted-foreground">{p.cadence}</div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Users className="size-3.5 text-muted-foreground" /> {p.filled ?? 0}/{p.spots} enrolled
              </div>
            </motion.div>
          )) : <div className="text-sm text-muted-foreground md:col-span-3 p-4">You have not created any mentor programs yet.</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}
