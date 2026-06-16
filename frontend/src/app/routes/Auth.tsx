import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { Logo } from "../components/brand/Logo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { ThemeToggle } from "../components/shell/ThemeToggle";
import { useAuth } from "../lib/auth";
import {
  GraduationCap, BriefcaseBusiness, ArrowRight, Sparkles,
  Plus, X, Linkedin, IdCard, Mail, School, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export type Role = "student" | "alumni" | "admin";
type RegisterRole = Exclude<Role, "admin">;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EDU_RE = /\.(edu|ac\.[a-z]{2,}|edu\.[a-z]{2,})$/i;

/* ---------- Fluid animated background ---------- */
function FluidBackground() {
  const blobs = [
    { c1: "#7C5CFF", c2: "#B19BFF", x: "-10%", y: "-10%", size: 520, d: 0 },
    { c1: "#F5B461", c2: "#FF6B8A", x: "70%",  y: "10%",  size: 460, d: 1.4 },
    { c1: "#5DE0B0", c2: "#7C5CFF", x: "20%",  y: "70%",  size: 500, d: 2.8 },
    { c1: "#FF6B8A", c2: "#F5B461", x: "65%",  y: "60%",  size: 420, d: 4.2 },
  ];
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(124,92,255,0.10),transparent_70%)]" />
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl opacity-40 dark:opacity-30 mix-blend-normal"
          style={{
            width: b.size,
            height: b.size,
            left: b.x,
            top: b.y,
            background: `linear-gradient(135deg, ${b.c1}, ${b.c2})`,
          }}
          animate={{
            x: [0, 60, -40, 30, 0],
            y: [0, -50, 40, -30, 0],
            scale: [1, 1.15, 0.95, 1.08, 1],
            rotate: [0, 40, -20, 25, 0],
          }}
          transition={{
            duration: 22 + i * 4,
            delay: b.d,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      <div className="absolute inset-0 backdrop-blur-2xl bg-background/40" />
      <div className="absolute inset-0 [background-image:linear-gradient(rgba(124,92,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(124,92,255,0.06)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000_40%,transparent_100%)]" />
    </div>
  );
}

/* ---------- Frame ---------- */
function AuthFrame({
  title, sub, children, backTo = "/",
}: { title: string; sub: string; children: React.ReactNode; backTo?: string }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      <FluidBackground />
      <div className="absolute top-0 inset-x-0 z-10">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to={backTo}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="size-4" /> Back
              </Button>
            </Link>
            <span className="hidden sm:inline-block"><Logo /></span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative w-full max-w-lg mt-16"
      >
        <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-xl shadow-[var(--shadow-lg)] p-7 sm:p-8">
          <div className="sm:hidden mb-5"><Logo /></div>
          <h1 className="font-serif text-4xl text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1">{sub}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          © ALink · A network worth belonging to.
        </p>
      </motion.div>
    </div>
  );
}

/* ---------- Login ---------- */
export function LoginPage() {
  const { user, login, loginAsDemo, isBusy } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [pendingDest, setPendingDest] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (pendingDest && user) nav(pendingDest, { replace: true });
  }, [pendingDest, user, nav]);

  const setSubmitted = (v: boolean) => v && setPendingDest("/app");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) { toast.error("Please enter a valid email"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    try {
      await login(normalizedEmail, password);
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please check your credentials and try again.";
      setLoginError(message);
      toast.error("Unable to sign in", {
        description: message,
      });
    }
  };

  return (
    <AuthFrame title="Welcome back" sub="Sign in to your ALink account.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email"><Mail className="size-3.5 inline mr-1.5" />Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input
            id="pw"
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={isBusy}>
          Continue <ArrowRight className="size-4" />
        </Button>

        {loginError && (
          <p className="text-sm text-[var(--rose)] text-center mt-3">{loginError}</p>
        )}

        <p className="text-sm text-muted-foreground text-center mt-4">
          New here?{" "}
          <Link to="/register" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </form>
    </AuthFrame>
  );
}

/* ---------- Register ---------- */
export function RegisterPage() {
  const { user, register, isBusy } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = React.useState<RegisterRole>(() => {
    const requested = searchParams.get("role");
    return requested === "alumni" ? "alumni" : "student";
  });
  const [email, setEmail] = React.useState("");
  const [instEmail, setInstEmail] = React.useState("");
  const [secondary, setSecondary] = React.useState<string[]>([]);
  const [secondaryDraft, setSecondaryDraft] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (submitted && user) nav("/onboarding", { replace: true });
  }, [submitted, user, nav]);

  const emailValid = email.length === 0 || EMAIL_RE.test(email.toLowerCase());
  const instValid = instEmail.length === 0 || (EMAIL_RE.test(instEmail.toLowerCase()) && EDU_RE.test(instEmail.toLowerCase()));

  const addSecondary = () => {
    const v = secondaryDraft.trim();
    if (!v || secondary.includes(v)) return;
    setSecondary((s) => [...s, v]);
    setSecondaryDraft("");
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) { toast.error("A valid email is required"); return; }
    if (instEmail && !instValid) { toast.error("Institution email must be .edu / .ac.*"); return; }
    if (!accepted) { toast.error("Please accept the terms to continue"); return; }
    const form = new FormData(e.currentTarget);
    const first = String(form.get("first") ?? "").trim();
    const last = String(form.get("last") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const university = String(form.get("primary") ?? "").trim();
    const major = String(form.get("major") ?? "").trim();
    const graduationRaw = String(form.get("grad") ?? "").trim();
    const linkedin = String(form.get("linkedin") ?? "").trim();
    const fullName = `${first} ${last}`.trim();

    if (!fullName) { toast.error("First and last name are required"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }

    const graduationYear = graduationRaw ? Number(graduationRaw) : undefined;
    if (graduationRaw && Number.isNaN(graduationYear)) {
      toast.error("Graduation year must be a valid number");
      return;
    }

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        name: fullName,
        role,
        institutionEmail: instEmail.trim().toLowerCase() || undefined,
        university: university || undefined,
        major: major || undefined,
        graduationYear,
        secondaryInstitutions: secondary,
        linkedin: linkedin || undefined,
      });
      setSubmitted(true);
    } catch (error) {
      toast.error("Unable to create account", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const idLabel = role === "alumni" ? "Alumni ID" : "Student ID";

  return (
    <AuthFrame title="Join ALink" sub="Three roles, one beautifully human network.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "student", label: "Student", icon: GraduationCap },
            { id: "alumni",  label: "Alumni",  icon: BriefcaseBusiness },
          ] as const).map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`group rounded-xl border p-3 text-left transition ${
                role === r.id
                  ? "border-[var(--brand-500)] bg-[color:var(--brand-50)] dark:bg-[color:var(--brand-900)]/30"
                  : "border-border hover:bg-muted"
              }`}
            >
              <r.icon className={`size-5 ${role === r.id ? "text-[var(--brand-600)] dark:text-[var(--brand-300)]" : "text-muted-foreground"}`} />
              <div className="mt-2 text-sm text-foreground">{r.label}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first">First name</Label>
            <Input id="first" name="first" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last">Last name</Label>
            <Input id="last" name="last" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email2"><Mail className="size-3.5 inline mr-1.5" />Email <span className="text-[var(--rose)]">*</span></Label>
          <Input
            id="email2"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            placeholder="you@example.com"
            className={!emailValid ? "border-[var(--rose)] focus-visible:ring-[var(--rose)]" : ""}
          />
          {!emailValid && <p className="text-xs text-[var(--rose)]">Please enter a valid email.</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="instEmail">
            <School className="size-3.5 inline mr-1.5" />
            Institution email <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="instEmail"
            type="email"
            value={instEmail}
            onChange={(e) => setInstEmail(e.target.value.toLowerCase())}
            placeholder="you@university.edu"
            className={!instValid ? "border-[var(--rose)] focus-visible:ring-[var(--rose)]" : ""}
          />
          <p className="text-xs text-muted-foreground">Speeds up verification if added later. Domains: .edu, .ac.*</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="uid"><IdCard className="size-3.5 inline mr-1.5" />{idLabel} <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="uid" placeholder="e.g. SU2027-018273" />
          </div>
          <div className="space-y-1.5">
              <Label htmlFor="grad">Graduation year</Label>
              <Input id="grad" name="grad" type="number" min={1960} max={2035} placeholder="2027" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="primary"><School className="size-3.5 inline mr-1.5" />Primary institution</Label>
            <Input id="primary" name="primary" required placeholder="Stanford University" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="major">Major</Label>
            <Input id="major" name="major" placeholder="Computer Science" />
          </div>

        <div className="space-y-1.5">
          <Label>Secondary institutions <span className="text-muted-foreground">(optional)</span></Label>
          <div className="flex gap-2">
            <Input
              value={secondaryDraft}
              onChange={(e) => setSecondaryDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSecondary(); } }}
              placeholder="Exchange program, prior school…"
            />
            <Button type="button" variant="outline" onClick={addSecondary}>
              <Plus className="size-4" />
            </Button>
          </div>
          {secondary.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {secondary.map((s) => (
                <Badge key={s} variant="secondary" className="rounded-full gap-1">
                  {s}
                  <button
                    type="button"
                    onClick={() => setSecondary((arr) => arr.filter((x) => x !== s))}
                    aria-label={`Remove ${s}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="li">
            <Linkedin className="size-3.5 inline mr-1.5" />
            LinkedIn <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="li" name="linkedin" placeholder="linkedin.com/in/you" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pw2">Password</Label>
          <Input id="pw2" name="password" type="password" required placeholder="At least 8 characters" />
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={accepted}
            onCheckedChange={(v) => setAccepted(Boolean(v))}
            className="mt-0.5"
          />
          <span>
            I agree to ALink's{" "}
            <a className="underline underline-offset-4 text-foreground">Terms</a> and{" "}
            <a className="underline underline-offset-4 text-foreground">Privacy Policy</a>.
          </span>
        </label>

        <Button type="submit" className="w-full gap-2" disabled={isBusy}>
          Create account <Sparkles className="size-4" />
        </Button>

        <p className="text-sm text-muted-foreground text-center mt-2">
          Have an account?{" "}
          <Link to="/login" className="text-foreground underline underline-offset-4">
            Log in
          </Link>
        </p>
      </form>
    </AuthFrame>
  );
}

/* ---------- Onboarding ---------- */
export function OnboardingPage() {
  const nav = useNavigate();
  const { user, update } = useAuth();
  const [step, setStep] = React.useState(0);
  const steps = ["Identity", "Academic", "Interests", "Done"];

  // Step 2 logic
  const TITLES = ["Software Engineer", "Product Manager", "Product Designer", "Data Scientist", "Marketing Manager", "Founder", "Analyst", "Consultant", "Student"];
  const [titleSearch, setTitleSearch] = React.useState(user?.title || "");
  const [showTitleDrop, setShowTitleDrop] = React.useState(false);

  // Step 3 logic
  const DEFAULT_EXPLORING = ["Software","Design","Product","AI/ML","Finance","Consulting","Venture","Robotics","Climate","Healthcare"];
  const [exploring, setExploring] = React.useState<string[]>([]);
  const [customExplore, setCustomExplore] = React.useState("");
  const [showAddExplore, setShowAddExplore] = React.useState(false);

  const toggleExplore = (t: string) => {
    setExploring(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  React.useEffect(() => {
    if (!user) nav("/login");
  }, [user, nav]);
  if (!user) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      <FluidBackground />
      <div className="absolute top-0 inset-x-0 z-10">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/register">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="size-4" /> Back
              </Button>
            </Link>
            <span className="hidden sm:inline-block"><Logo /></span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-2xl mt-16">
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Welcome, {user.name.split(" ")[0]}</span>
          <span>Step {Math.min(step + 1, steps.length)} of {steps.length}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-8">
          <motion.div
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            className="h-full brand-gradient"
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6"
        >
          {step === 0 && (
            <Field title="Tell us who you are" sub="This helps personalize ALink for you.">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Display name" defaultValue={user.name} onBlur={(e) => update({ name: e.target.value })} />
                <Input placeholder="Location" defaultValue={user.location} onBlur={(e) => update({ location: e.target.value })} />
              </div>
            </Field>
          )}
          {step === 1 && (
            <Field title="Academic details" sub="Used to verify and connect you to the right people.">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="University" defaultValue={user.university} onBlur={(e) => update({ university: e.target.value })} />
                <Input placeholder="Major" defaultValue={user.major} onBlur={(e) => update({ major: e.target.value })} />
                <Input placeholder="Graduation year" defaultValue={String(user.graduationYear ?? 2027)} onBlur={(e) => update({ graduationYear: Number(e.target.value) })} />
                <div className="relative">
                  <Input placeholder="Current title" value={titleSearch} onChange={(e) => setTitleSearch(e.target.value)} onFocus={() => setShowTitleDrop(true)} onBlur={() => { setTimeout(() => setShowTitleDrop(false), 200); update({ title: titleSearch }); }} />
                  {showTitleDrop && (
                    <div className="absolute z-50 w-full top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto p-1">
                      {TITLES.filter(t => t.toLowerCase().includes(titleSearch.toLowerCase())).length > 0 ? (
                        TITLES.filter(t => t.toLowerCase().includes(titleSearch.toLowerCase())).map(t => (
                          <button
                            key={t}
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-md"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setTitleSearch(t);
                              update({ title: t });
                              setShowTitleDrop(false);
                            }}
                          >
                            {t}
                          </button>
                        ))
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-md text-[var(--brand-600)] dark:text-[var(--brand-400)]"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            update({ title: titleSearch });
                            setShowTitleDrop(false);
                          }}
                        >
                          Use "{titleSearch}" (Others)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Field>
          )}
          {step === 2 && (
            <Field title="What are you exploring?" sub="Pick a few. You can change these later.">
              <div className="flex flex-wrap gap-2">
                {DEFAULT_EXPLORING.concat(exploring.filter(e => !DEFAULT_EXPLORING.includes(e))).map((t) => (
                  <button key={t} type="button" onClick={() => toggleExplore(t)} className={`px-3 py-1.5 rounded-full border text-sm transition ${exploring.includes(t) ? 'border-[var(--brand-500)] bg-[var(--brand-500)] text-white' : 'border-border hover:bg-muted'}`}>
                    {t}
                  </button>
                ))}
                {showAddExplore ? (
                  <div className="flex items-center gap-2">
                    <Input autoFocus className="w-32 h-8 rounded-full text-sm" value={customExplore} onChange={(e) => setCustomExplore(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && customExplore.trim()) { toggleExplore(customExplore.trim()); setCustomExplore(""); setShowAddExplore(false); } else if (e.key === "Escape") { setShowAddExplore(false); } }} onBlur={() => { if (customExplore.trim()) toggleExplore(customExplore.trim()); setCustomExplore(""); setShowAddExplore(false); }} />
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAddExplore(true)} className="px-3 py-1.5 rounded-full border border-dashed border-border text-sm hover:bg-muted flex items-center gap-1 text-muted-foreground"><Plus className="size-3" /> Add</button>
                )}
              </div>
            </Field>
          )}
          {step === 3 && (
            <Field title="You're all set." sub="Welcome to ALink. Let's open your dashboard.">
              <div className="rounded-xl bg-[color:var(--brand-50)] dark:bg-[color:var(--brand-900)]/40 p-4 text-sm text-foreground">
                <Sparkles className="size-4 inline mr-2 text-[var(--brand-600)] dark:text-[var(--brand-300)]" />
                Pro tip: press{" "}
                <kbd className="font-mono text-xs rounded bg-background border border-border px-1.5 py-0.5">{navigator.platform.toUpperCase().includes('WIN') ? 'Ctrl+K' : '⌘K'}</kbd>{" "}
                to search anywhere.
              </div>
            </Field>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} className="gap-2">
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={() => nav("/app")} className="gap-2">
                Enter ALink <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-serif text-3xl text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-1">{sub}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
