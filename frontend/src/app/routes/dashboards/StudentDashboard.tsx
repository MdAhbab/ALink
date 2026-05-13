import * as React from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useAuth } from "../../lib/auth";
import { apiRequest, apiRequestAll, getAuthToken } from "../../lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Calendar, Compass, Briefcase, BookOpen, Sparkles, Target, Trophy, ChevronRight, Flame, Users, Award } from "lucide-react";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function StudentDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [people, setPeople] = React.useState<any[]>([]);
  const [activity, setActivity] = React.useState<any[]>([]);
  const [achievements, setAchievements] = React.useState<any[]>([]);
  const [studentGoals, setStudentGoals] = React.useState<any[]>([]);
  const [referrals, setReferrals] = React.useState<any[]>([]);
  const [connections, setConnections] = React.useState<any[]>([]);
  const [mentorPrograms, setMentorPrograms] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    const token = getAuthToken();
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      apiRequestAll<any>("/bookings", { token, signal: controller.signal }).then(setBookings).catch(() => {}),
      apiRequest<any[]>("/events", { token, signal: controller.signal }).then(setEvents).catch(() => {}),
      apiRequestAll<any>("/jobs", { token, signal: controller.signal }).then(setJobs).catch(() => {}),
      apiRequestAll<any>("/users", { token, signal: controller.signal }).then(setPeople).catch(() => {}),
      apiRequestAll<any>("/activity", { token, signal: controller.signal }).then(setActivity).catch(() => {}),
      apiRequest<any[]>("/achievements", { token, signal: controller.signal }).then(setAchievements).catch(() => {}),
      apiRequest<any[]>("/goals", { token, signal: controller.signal }).then(setStudentGoals).catch(() => {}),
      apiRequestAll<any>("/referrals", { token, signal: controller.signal }).then(setReferrals).catch(() => {}),
      apiRequest<any[]>("/connections", { token, signal: controller.signal }).then(setConnections).catch(() => {}),
      apiRequest<any[]>("/mentorship/programs", { token, signal: controller.signal }).then(setMentorPrograms).catch(() => {}),
    ]).finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  const upcoming = bookings.find(b => b.status === "upcoming");
  const heroRef = React.useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -50]);
  const blobX = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -30]);
  const tintY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 30]);
  const blob2Y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Hero */}
      <motion.div ref={heroRef} variants={item} className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
        <motion.div aria-hidden style={{ y: tintY }} className="absolute inset-0 -z-10 opacity-[0.10] brand-gradient" />
        <motion.div aria-hidden style={{ y: blobY, x: blobX }} className="absolute -right-16 -bottom-16 size-72 rounded-full brand-gradient opacity-20 blur-3xl" />
        <motion.div aria-hidden style={{ y: blob2Y }} className="absolute -left-20 -top-20 size-60 rounded-full bg-[var(--amber)]/15 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <Badge variant="secondary" className="rounded-full"><Flame className="size-3" /> 7-day streak</Badge>
            <h1 className="font-serif text-4xl md:text-5xl mt-3">
              Hi {user!.name.split(" ")[0]}, <span className="brand-gradient-text italic">3 alumni want to meet you.</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Welcome back. Connect with peers, browse events, or request mentorship.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/app/finder"><Button className="gap-2"><Compass className="size-4" /> Find alumni</Button></Link>
            <Link to="/app/events"><Button variant="outline" className="gap-2"><Calendar className="size-4" /> Browse events</Button></Link>
          </div>
        </div>
      </motion.div>

      {/* Stat tiles */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Connections", v: connections.length, sub: "In your network", tone: "var(--brand-500)" },
          { l: "Sessions booked", v: bookings.length, sub: "Lifetime sessions", tone: "var(--amber)" },
          { l: "Active referrals", v: referrals.length, sub: "Pending/Forwarded", tone: "var(--mint)" },
          { l: "ALink XP", v: activity.length * 10, sub: `Level ${Math.max(1, Math.floor(activity.length / 5))} · Networker`, tone: "var(--rose)" },
        ].map((s) => (
          <Card key={s.l} className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: s.tone }} />
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">{s.l}</div>
              <div className="font-serif text-3xl mt-1">{s.v}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Goals */}
        <motion.div variants={item} className="lg:col-span-1 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">Your goals</h3>
            <Target className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">This semester</p>
          <div className="mt-4 space-y-4">
            {studentGoals.length > 0 ? studentGoals.map(g => (
              <div key={g.id}>
                <div className="flex justify-between text-sm"><span>{g.label}</span><span className="text-muted-foreground">{g.progress}%</span></div>
                <Progress value={g.progress} className="mt-1.5 h-1.5" />
              </div>
            )) : <p className="text-sm text-muted-foreground mt-4">No goals set for this semester.</p>}
          </div>
          <Button variant="ghost" size="sm" className="mt-4 gap-1">Adjust goals <ChevronRight className="size-3" /></Button>
        </motion.div>

        {/* Next session big card */}
        <motion.div variants={item} className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl">Next session</h3>
              <p className="text-sm text-muted-foreground">Your most important meeting this week</p>
            </div>
            <Link to="/app/bookings"><Button variant="ghost" size="sm">All sessions <ChevronRight className="size-3.5" /></Button></Link>
          </div>
          {upcoming ? (
            <div className="p-5 grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div className="flex items-center gap-4">
                <Avatar className="size-14"><AvatarImage src={upcoming.with.avatar} /><AvatarFallback>{upcoming.with.name[0]}</AvatarFallback></Avatar>
                <div>
                  <div className="font-serif text-2xl">{upcoming.topic}</div>
                  <div className="text-sm text-muted-foreground">{upcoming.with.name} · {upcoming.with.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{upcoming.date} · {upcoming.time} · {upcoming.duration}m</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button>Join meeting</Button>
                <Button variant="outline">Prep notes</Button>
              </div>
            </div>
          ) : <div className="p-5 text-sm text-muted-foreground">No upcoming sessions — explore mentor programs below.</div>}
        </motion.div>
      </div>

      {/* Recommended alumni + jobs */}
      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div variants={item} className="rounded-2xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div><h3 className="font-serif text-2xl">For you · alumni</h3><p className="text-sm text-muted-foreground">Based on your major & goals</p></div>
            <Sparkles className="size-4 text-[var(--brand-500)]" />
          </div>
          <div className="p-3 space-y-1">
            {people.filter(p => p.role === "alumni").slice(0, 4).map(p => (
              <Link to={`/app/connections?focus=${p.id}`} key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition group">
                <Avatar className="size-10"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate flex items-center gap-1.5">{p.name}{p.open && <span className="size-1.5 rounded-full bg-[var(--mint)]" title="Open to mentor" />}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.title}{p.company ? ` · ${p.company}` : ""}</div>
                </div>
                <Button size="sm" variant="outline" className="h-7 px-2.5 opacity-0 group-hover:opacity-100 transition">Connect</Button>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div><h3 className="font-serif text-2xl">Jobs by alumni</h3><p className="text-sm text-muted-foreground">Refer-ready roles for your network</p></div>
            <Briefcase className="size-4 text-[var(--brand-500)]" />
          </div>
          <div className="divide-y divide-border">
            {jobs.slice(0, 4).length > 0 ? jobs.slice(0, 4).map(j => (
              <Link to="/app/jobs" key={j.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                <div className="size-10 rounded-xl grid place-items-center font-mono text-xs text-white" style={{ background: `linear-gradient(135deg, var(--brand-500), var(--amber))` }}>
                  {j.company.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{j.role}</div>
                  <div className="text-xs text-muted-foreground truncate">{j.company} · {j.location}</div>
                </div>
                <Badge variant="secondary" className="rounded-full">{j.alumniCount ?? 0} alumni</Badge>
              </Link>
            )) : <div className="p-5 text-sm text-muted-foreground">No recent jobs to show.</div>}
          </div>
        </motion.div>
      </div>

      {/* Programs + Achievements */}
      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div variants={item} className="lg:col-span-2 rounded-2xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div><h3 className="font-serif text-2xl">Mentor programs</h3><p className="text-sm text-muted-foreground">Curated cohorts to level up</p></div>
            <Link to="/app/mentorship"><Button variant="ghost" size="sm">Explore <ChevronRight className="size-3.5" /></Button></Link>
          </div>
          <div className="p-4 grid sm:grid-cols-2 gap-3">
            {mentorPrograms.slice(0, 2).length > 0 ? mentorPrograms.slice(0, 2).map(p => (
              <motion.div key={p.id} whileHover={{ y: -2 }} className="rounded-xl border border-border p-4">
                <Badge variant="outline" className="rounded-full">{p.duration}</Badge>
                <div className="font-serif text-lg mt-2">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.cadence}</div>
                <div className="flex items-center gap-2 mt-3">
                  <Avatar className="size-6"><AvatarImage src={p.mentor?.avatar} /><AvatarFallback>{p.mentor?.name?.[0]}</AvatarFallback></Avatar>
                  <span className="text-xs">{p.mentor?.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{p.spots - (p.filled ?? 0)} spots left</span>
                </div>
              </motion.div>
            )) : <div className="p-4 text-sm text-muted-foreground md:col-span-2">No mentor programs available right now.</div>}
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">Achievements</h3>
            <Trophy className="size-4 text-[var(--amber)]" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {achievements.length > 0 ? achievements.map(a => (
              <motion.div key={a.id} whileHover={{ scale: 1.05, rotate: -2 }}
                className={`aspect-square rounded-2xl grid place-items-center text-2xl relative ${a.earnedAt ? "bg-[color:var(--brand-50)] dark:bg-[color:var(--brand-900)]/40" : "bg-muted/40 grayscale opacity-50"}`}
                title={`${a.title} · ${a.rarity}`}>
                <span>{a.emoji}</span>
                {a.earnedAt && <span className="absolute -top-1 -right-1 text-[8px] uppercase tracking-wider bg-foreground text-background rounded-full px-1.5 py-0.5">{a.rarity}</span>}
              </motion.div>
            )) : <div className="col-span-3 text-sm text-muted-foreground">Complete tasks to earn achievements.</div>}
          </div>
          <Link to="/app/achievements" className="block mt-3 text-xs text-muted-foreground hover:text-foreground">See all →</Link>
        </motion.div>
      </div>

      {/* Activity */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card">
        <div className="p-5 border-b border-border"><h3 className="font-serif text-2xl">Activity</h3></div>
        <div className="divide-y divide-border">
          {activity.length > 0 ? activity.map(a => (
            <div key={a.id} className="p-4 flex items-center gap-3 hover:bg-muted/40">
              <div className="size-8 rounded-lg bg-[color:var(--brand-50)] dark:bg-[color:var(--brand-900)]/40 grid place-items-center">
                {a.kind === "connection" ? <Users className="size-4 text-[var(--brand-600)]" /> :
                 a.kind === "booking" ? <Calendar className="size-4 text-[var(--brand-600)]" /> :
                 a.kind === "referral" ? <Briefcase className="size-4 text-[var(--brand-600)]" /> :
                 a.kind === "verify" ? <Award className="size-4 text-[var(--mint)]" /> :
                 <Sparkles className="size-4 text-[var(--brand-600)]" />}
              </div>
              <div className="flex-1"><div className="text-sm">{a.title}</div><div className="text-xs text-muted-foreground">{a.meta}</div></div>
              <div className="text-xs text-muted-foreground">{a.at}</div>
            </div>
          )) : <div className="p-5 text-sm text-muted-foreground text-center">No recent activity.</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}
