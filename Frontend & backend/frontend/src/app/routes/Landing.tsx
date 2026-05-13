import * as React from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useReducedMotion } from "motion/react";
import { ArrowRight, Compass, Sparkles, Users, Briefcase, Calendar, Shield, Award, GraduationCap, Star, Zap, Heart, Quote, ChevronRight, MessageSquare, BookOpen, Globe2 } from "lucide-react";
import { Logo } from "../components/brand/Logo";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ConnectingPuzzle } from "../components/playful/ConnectingPuzzle";
import { ThemeToggle } from "../components/shell/ThemeToggle";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.55, delay, ease: [0.2, 0.7, 0.2, 1] as const },
});

export default function Landing() {
  const heroRef = React.useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const reduce = useReducedMotion();

  // Parallax layers
  const blobY1 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
  const blobY2 = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 160]);
  const gridY  = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const subY   = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -20]);
  const puzzleY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);

  // Mouse parallax for hero
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18 });
  const sy = useSpring(my, { stiffness: 80, damping: 18 });
  const tx1 = useTransform(sx, (v) => v * 20);
  const ty1 = useTransform(sy, (v) => v * 20);
  const tx2 = useTransform(sx, (v) => v * -14);
  const ty2 = useTransform(sy, (v) => v * -14);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo withWord={false} />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#stories" className="hover:text-foreground">Stories</a>
            <a href="#pricing" className="hover:text-foreground">For schools</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login"><Button variant="ghost">Log in</Button></Link>
            <Link to="/register"><Button>Join ALink</Button></Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} onMouseMove={onMove} className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Parallax background layers */}
        <motion.div aria-hidden style={{ y: gridY }} className="absolute inset-0 -z-30 opacity-[0.45]">
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,92,255,0.25),transparent_70%)]" />
          <div className="absolute inset-0 [background-image:linear-gradient(rgba(124,92,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,92,255,0.08)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:radial-gradient(60%_60%_at_50%_40%,#000_50%,transparent_100%)]" />
        </motion.div>
        <motion.div aria-hidden style={{ y: blobY1, x: tx1 }} className="absolute -top-32 -left-24 size-[560px] rounded-full blur-3xl opacity-50 brand-gradient -z-20" />
        <motion.div aria-hidden style={{ y: blobY2, x: tx2 }} className="absolute top-40 -right-32 size-[520px] rounded-full blur-3xl opacity-40 brand-gradient -z-20" />

        <div className="max-w-6xl mx-auto px-5 pt-10 pb-20 grid lg:grid-cols-12 gap-10 items-center w-full">
          <div className="lg:col-span-7">
            <motion.div {...fade(0)}>
              <div className="font-serif text-5xl md:text-6xl leading-none tracking-tight mb-6">
                A<span className="brand-gradient-text">link</span>
              </div>
            </motion.div>
            <motion.h1 {...fade(0.05)} style={{ y: titleY }} className="mt-5 font-serif text-5xl md:text-7xl leading-[1.02] tracking-tight">
              The pieces of your career, <br />
              <span className="brand-gradient-text italic">finally click into place.</span>
            </motion.h1>
            <motion.p {...fade(0.1)} style={{ y: subY }} className="mt-5 text-lg text-muted-foreground max-w-xl">
              ALink connects students with verified alumni through mentorship, bookable consultations, and warm referrals — designed like the network you wish your campus had.
            </motion.p>
            <motion.div {...fade(0.15)} className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/register"><Button size="lg" className="gap-2 group">Get started <ArrowRight className="size-4 group-hover:translate-x-0.5 transition" /></Button></Link>
              <Link to="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
            </motion.div>

            <motion.div {...fade(0.2)} className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["1","2","3","4","5"].map(s => (
                  <img key={s} className="size-8 rounded-full ring-2 ring-background"
                    src={`https://api.dicebear.com/9.x/notionists/svg?seed=${s}&backgroundColor=ede9fe,fef3c7,d1fae5,fce7f3`} />
                ))}
              </div>
              <span>Joined by <strong className="text-foreground">14,823</strong> students & alumni across <strong className="text-foreground">120+</strong> universities</span>
            </motion.div>

            <motion.div {...fade(0.25)} className="mt-10 grid grid-cols-3 gap-3 max-w-md">
              <Tile k="5,904" v="Verified alumni" tone="#7C5CFF" />
              <Tile k="1,240" v="Sessions / mo" tone="#F5B461" />
              <Tile k="487"   v="Referrals live" tone="#5DE0B0" />
            </motion.div>
          </div>

          <motion.div {...fade(0.18)} style={{ y: puzzleY }} className="lg:col-span-5 relative">
            <ConnectingPuzzle />
            <Caption />
          </motion.div>
        </div>

        <ScrollHint />
      </section>

      {/* Marquee logos */}
      <Marquee />

      {/* HOW IT WORKS — staged with sticky parallax */}
      <section id="how" className="max-w-6xl mx-auto px-5 py-24">
        <motion.div {...fade()} className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary">How ALink works</Badge>
          <h2 className="font-serif text-4xl md:text-5xl mt-3">Three steps. One stronger alumni line.</h2>
        </motion.div>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { n: "01", icon: Compass, title: "Discover", text: "Filter alumni by company, major, or industry. Verified, mentor-ready, and human." },
            { n: "02", icon: Calendar, title: "Connect", text: "Book a 30-min consultation or send a thoughtful intro request. Calendar magic included." },
            { n: "03", icon: Briefcase, title: "Grow", text: "Land referrals, mentorship, and your next opportunity. Track everything from one inbox." },
          ].map((s, i) => (
            <motion.div key={s.n} {...fade(i * 0.05)}
              whileHover={{ y: -4 }}
              className="relative rounded-3xl border border-border bg-card p-6 overflow-hidden group"
            >
              <div className="absolute -top-8 -right-8 size-32 rounded-full brand-gradient opacity-15 blur-2xl group-hover:opacity-30 transition" />
              <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
              <div className="mt-3 size-12 rounded-2xl brand-gradient grid place-items-center text-white">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-serif text-2xl">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ROLES — playful tabs */}
      <RolesSection />

      {/* FEATURES grid */}
      <section id="features" className="bg-muted/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-5 py-24">
          <motion.div {...fade()} className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary">Built for momentum</Badge>
            <h2 className="font-serif text-4xl md:text-5xl mt-3">Every feature, in service of one good intro.</h2>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { i: Calendar,    t: "Bookable consultations", d: "Pick a time, share context, get a meeting link." },
              { i: Briefcase,   t: "Warm referrals",         d: "Send a pitch + resume. Track status step by step." },
              { i: Users,       t: "Trusted directory",      d: "Filter by school, industry, company. Verified badges." },
              { i: Award,       t: "Mentor programs",        d: "Curated cohorts. Office hours. Long-arc mentorship." },
              { i: BookOpen,    t: "Stories & playbooks",    d: "Alumni share career paths and what actually worked." },
              { i: Globe2,      t: "Campus events",          d: "Mixers, panels, and chapter meetups in your city." },
              { i: MessageSquare,t:"Inbox-first messaging", d: "Async DMs with read receipts and reply suggestions." },
              { i: Zap,         t: "Command palette",        d: "⌘K to fly anywhere. Keyboard-first by design." },
              { i: Shield,      t: "Admin moderation",       d: "Verify, moderate, and protect your community at scale." },
            ].map((f, i) => (
              <motion.div key={f.t} {...fade(i * 0.03)}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="size-9 rounded-xl bg-[color:var(--brand-50)] grid place-items-center">
                  <f.i className="size-4 text-[var(--brand-600)]" />
                </div>
                <div className="mt-3 font-serif text-xl">{f.t}</div>
                <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section id="stories" className="max-w-6xl mx-auto px-5 py-24">
        <motion.div {...fade()} className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary"><Quote className="size-3" /> Stories</Badge>
          <h2 className="font-serif text-4xl md:text-5xl mt-3">Real intros. Real outcomes.</h2>
        </motion.div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { q: "My referral on ALink turned into my first job.", n: "Sofia · Stanford ’26", c: "#7C5CFF" },
            { q: "I've mentored 14 students this year. It's the best part of my week.", n: "Maya · Linear, Staff Designer", c: "#F5B461" },
            { q: "Verifications used to take a week. Now it's same-day.", n: "Carla · Career Services Director", c: "#5DE0B0" },
          ].map((s, i) => (
            <motion.figure key={i} {...fade(i * 0.05)}
              whileHover={{ y: -4, rotate: i % 2 ? 0.5 : -0.5 }}
              className="relative rounded-3xl border border-border bg-card p-6"
            >
              <div className="absolute -top-3 -left-3 size-9 rounded-2xl grid place-items-center text-white" style={{ background: s.c }}>
                <Quote className="size-4" />
              </div>
              <blockquote className="font-serif text-2xl leading-snug">"{s.q}"</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">{s.n}</figcaption>
              <div className="mt-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="size-3.5 fill-[var(--amber)] text-[var(--amber)]" />)}
              </div>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* PRICING / SCHOOLS */}
      <section id="pricing" className="bg-[color:var(--ink)] text-white">
        <div className="max-w-6xl mx-auto px-5 py-24 grid lg:grid-cols-12 gap-10 items-center">
          <motion.div {...fade()} className="lg:col-span-7">
            <Badge variant="secondary" className="rounded-full bg-white/10 text-white border-white/10">For universities</Badge>
            <h2 className="font-serif text-4xl md:text-5xl mt-3">Give your alumni network a home worth visiting.</h2>
            <p className="mt-4 text-white/75 max-w-xl">ALink for Schools includes SSO, custom branding, verification workflows, jobs board moderation, and analytics dashboards.</p>
            <div className="mt-7 flex gap-3">
              <Link to="/register"><Button size="lg" className="bg-white text-[#0B0D1F] hover:bg-white/90">Talk to us</Button></Link>
              <Link to="/login"><Button size="lg" variant="ghost" className="text-white hover:bg-white/10">Sign in</Button></Link>
            </div>
          </motion.div>
          <motion.div {...fade(0.1)} className="lg:col-span-5 grid grid-cols-2 gap-3">
            {[
              { k: "98%", v: "Verification accuracy" },
              { k: "3.4x", v: "Engagement uplift" },
              { k: "<24h", v: "Avg response time" },
              { k: "120+", v: "Universities live" },
            ].map(x => (
              <div key={x.v} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <div className="font-serif text-3xl">{x.k}</div>
                <div className="text-xs text-white/70">{x.v}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 py-24 text-center relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 opacity-30 blur-3xl brand-gradient" />
        <motion.h2 {...fade()} className="font-serif text-4xl md:text-6xl">Make your next intro count.</motion.h2>
        <motion.p {...fade(0.05)} className="text-muted-foreground mt-3 max-w-xl mx-auto">Join thousands of students and alumni already meeting on ALink.</motion.p>
        <motion.div {...fade(0.1)} className="mt-7 inline-flex gap-3">
          <Link to="/register"><Button size="lg" className="gap-2">Create account <Heart className="size-4" /></Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">Log in</Button></Link>
        </motion.div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-10 grid md:grid-cols-4 gap-6 text-sm">
          <div>
            <Logo />
            <p className="text-muted-foreground mt-3 max-w-xs">A network worth belonging to. Built for the people who make a campus.</p>
          </div>
          {[
            { h: "Product", l: ["Discover", "Bookings", "Referrals", "Events"] },
            { h: "Company", l: ["About", "Careers", "Press", "Contact"] },
            { h: "Legal",   l: ["Privacy", "Terms", "Trust", "Cookies"] },
          ].map(c => (
            <div key={c.h}>
              <div className="text-muted-foreground">{c.h}</div>
              <ul className="mt-2 space-y-1.5">
                {c.l.map(x => <li key={x}><a className="hover:text-foreground" href="#">{x}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border py-5 px-5 max-w-6xl mx-auto flex justify-between text-xs text-muted-foreground">
          <span>© 2026 ALink</span>
          <span>Crafted with care.</span>
        </div>
      </footer>
    </div>
  );
}

function Tile({ k, v, tone }: { k: string; v: string; tone: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="rounded-2xl bg-card border border-border p-3">
      <div className="font-serif text-2xl" style={{ color: tone }}>{k}</div>
      <div className="text-xs text-muted-foreground">{v}</div>
    </motion.div>
  );
}

function Caption() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
    >
      Live connections · alumni ↔ students
    </motion.div>
  );
}

function ScrollHint() {
  return (
    <motion.div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground flex items-center gap-2"
      animate={{ y: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Infinity }}
    >
      Scroll <ChevronRight className="size-3 rotate-90" />
    </motion.div>
  );
}


function Marquee() {
  const universities = ["Stanford","MIT","Harvard","Berkeley","CMU","Princeton","Yale","Cornell","Georgia Tech","Oxford","UCLA","Columbia"];
  return (
    <section className="border-y border-border bg-card/40">
      <div className="py-5 overflow-hidden relative [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
        <motion.div className="flex gap-10 whitespace-nowrap font-serif text-muted-foreground text-xl"
          animate={{ x: ["0%", "-50%"] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {[...universities, ...universities].map((u, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--brand-400)]" />{u}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function RolesSection() {
  const [tab, setTab] = React.useState<"student"|"alumni"|"admin">("student");
  const data = {
    student: {
      headline: "Find alumni who've walked your path.",
      bullets: ["Discover verified alumni by major & industry", "Book 30-min consultations in two clicks", "Track referrals from submitted to forwarded"],
      tint: "from-[#7C5CFF]/15",
      icon: GraduationCap,
    },
    alumni: {
      headline: "Give back, on your own terms.",
      bullets: ["Open hours and pay-it-forward sessions", "Refer high-signal students to your team", "See your mentorship impact, beautifully"],
      tint: "from-[#F5B461]/20",
      icon: Award,
    },
    admin: {
      headline: "Trust, safety, and growth at scale.",
      bullets: ["Verification queue with audit trail", "Moderate jobs, referrals, and reports", "Cohort analytics that actually matter"],
      tint: "from-[#5DE0B0]/20",
      icon: Shield,
    },
  } as const;
  const active = data[tab];
  return (
    <section className="max-w-6xl mx-auto px-5 py-24">
      <motion.div {...fade()} className="text-center max-w-2xl mx-auto">
        <Badge variant="secondary">Three roles, one elegant home</Badge>
        <h2 className="font-serif text-4xl md:text-5xl mt-3">Designed for everyone on campus.</h2>
      </motion.div>

      <div className="mt-8 mx-auto flex p-1 rounded-full bg-card border border-border w-fit relative">
        {(["student","alumni","admin"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative px-4 py-1.5 text-sm capitalize rounded-full">
            {tab === t && (
              <motion.div layoutId="rolePill" className="absolute inset-0 rounded-full brand-gradient" transition={{ type: "spring", stiffness: 220, damping: 22 }} />
            )}
            <span className={`relative ${tab === t ? "text-white" : "text-foreground"}`}>{t}</span>
          </button>
        ))}
      </div>

      <div className={`relative mt-8 rounded-3xl border border-border overflow-hidden bg-card`}>
        <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${active.tint} to-transparent`} />
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-6 p-8">
          <div>
            <active.icon className="size-7 text-[var(--brand-600)]" />
            <h3 className="font-serif text-3xl md:text-4xl mt-3">{active.headline}</h3>
            <ul className="mt-4 space-y-2">
              {active.bullets.map(b => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 size-1.5 rounded-full bg-[var(--brand-500)]" />{b}
                </li>
              ))}
            </ul>
            <div className="mt-6"><Link to="/register"><Button>Get started as {tab}</Button></Link></div>
          </div>
          <RoleVisual role={tab} />
        </motion.div>
      </div>
    </section>
  );
}

function RoleVisual({ role }: { role: "student"|"alumni"|"admin" }) {
  if (role === "student") {
    return (
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="text-xs text-muted-foreground">Today's matches · 4</div>
        {[
          { n: "Maya Patel", t: "Staff Designer @ Linear" },
          { n: "Jordan Reyes", t: "Sr. Engineer @ Stripe" },
          { n: "Hannah Cohen", t: "Founder @ Frame.ai" },
        ].map((m, i) => (
          <motion.div key={m.n} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 + 0.1 }}
            className="mt-2 flex items-center gap-3 rounded-xl p-2 hover:bg-muted/60">
            <img className="size-8 rounded-full" src={`https://api.dicebear.com/9.x/notionists/svg?seed=${m.n}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{m.n}</div>
              <div className="text-xs text-muted-foreground truncate">{m.t}</div>
            </div>
            <Button size="sm" className="h-7 px-2">Connect</Button>
          </motion.div>
        ))}
      </div>
    );
  }
  if (role === "alumni") {
    return (
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">Your impact</div><Badge variant="outline" className="rounded-full">This year</Badge></div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[{k:"14",v:"Mentees"},{k:"36h",v:"Given"},{k:"9",v:"Referrals"}].map(s => (
            <div key={s.v} className="rounded-xl bg-muted/50 p-3"><div className="font-serif text-2xl">{s.k}</div><div className="text-[10px] text-muted-foreground">{s.v}</div></div>
          ))}
        </div>
        <div className="mt-3 h-24 rounded-xl bg-muted/40 grid place-items-center text-xs text-muted-foreground">
          <span>Mentorship hours · last 12 weeks</span>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs text-muted-foreground">Verification queue</div>
      {["Priya Shah","Marcus Bell","Yuki Sato"].map((n, i) => (
        <motion.div key={n} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 + 0.1 }}
          className="mt-2 flex items-center gap-3 rounded-xl p-2 border border-border">
          <img className="size-8 rounded-full" src={`https://api.dicebear.com/9.x/notionists/svg?seed=${n}`} />
          <div className="flex-1 min-w-0"><div className="text-sm truncate">{n}</div><div className="text-xs text-muted-foreground">Pending review</div></div>
          <Button size="sm" variant="outline" className="h-7 px-2">Approve</Button>
        </motion.div>
      ))}
    </div>
  );
}
