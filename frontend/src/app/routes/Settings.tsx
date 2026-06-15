import * as React from "react";
import { motion } from "motion/react";
import { useAuth } from "../lib/auth";
import { apiRequest, getAuthToken } from "../lib/api";
import { useTheme } from "../lib/theme";
import { Card, CardContent } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { ThemeSwitchPair } from "../components/shell/ThemeToggle";
import { AvatarPicker } from "../components/profile/AvatarPicker";
import {
  Bell, Eye, Lock, Palette, Trash2, KeyRound, Globe, Languages, Mail, Phone,
  Sparkles, Download, LogOut, Check,
} from "lucide-react";
import { toast } from "sonner";

type Prefs = {
  emailDigest: boolean;
  productUpdates: boolean;
  bookingReminders: boolean;
  messagePings: boolean;
  showInDirectory: boolean;
  openToMentorship: boolean;
  openToReferrals: boolean;
  reduceMotion: boolean;
  twoFactor: boolean;
  language: string;
  density: "comfortable" | "compact";
  accent: "violet" | "amber" | "mint" | "rose";
};

const defaultPrefs: Prefs = {
  emailDigest: true,
  productUpdates: false,
  bookingReminders: true,
  messagePings: true,
  showInDirectory: true,
  openToMentorship: true,
  openToReferrals: true,
  reduceMotion: false,
  twoFactor: false,
  language: "English",
  density: "comfortable",
  accent: "violet",
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem("alink:prefs");
    if (raw) return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {}
  return defaultPrefs;
}

export default function Settings() {
  const { user, update, logout } = useAuth();
  const { theme } = useTheme();
  
  // Use user.prefs from auth context combined with defaults
  const [prefs, setPrefs] = React.useState<Prefs>({ ...defaultPrefs, ...(user?.prefs || {}) });
  const [draft, setDraft] = React.useState(user);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setPrefs({ ...defaultPrefs, ...(user.prefs || {}) });
    setDraft(user);
  }, [user]);

  // Save prefs locally on change to maintain local caching
  React.useEffect(() => {
    try { localStorage.setItem("alink:prefs", JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  React.useEffect(() => {
    document.documentElement.dataset.density = prefs.density;
  }, [prefs.density]);

  if (!user) return null;

  const setP = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      update(k === "openToMentorship" ? { openToMentor: v as boolean, prefs: next } : { prefs: next });
      return next;
    });
  };

  const saveAccount = async () => {
    if (!draft) return;
    try {
      await update(draft);
      toast.success("Account info updated");
    } catch (error: any) {
      toast.error("Unable to update account", { description: error?.message || "Please try again." });
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please enter current password and confirm your new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await apiRequest<any>("/users/me/password", {
        method: "POST",
        token: getAuthToken() ?? undefined,
        body: { currentPassword, newPassword },
      });
      // The server rotates the token version on password change; store the
      // fresh token it returns so the current session stays authenticated.
      if (res?.access_token) {
        try { localStorage.setItem("alink:token", res.access_token); } catch {}
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error: any) {
      toast.error("Unable to update password", { description: error?.message || "Please check your current password." });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preferences</div>
        <h1 className="font-serif text-4xl mt-1">Settings</h1>
        <p className="text-muted-foreground mt-1">Tune how ALink looks, feels, and reaches you.</p>
      </header>

      <Tabs defaultValue="account">
        <TabsList className="flex-wrap">
          <TabsTrigger value="account"><Mail className="size-3.5" /> Account</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="size-3.5" /> Appearance</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="size-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="privacy"><Eye className="size-3.5" /> Privacy</TabsTrigger>
          <TabsTrigger value="security"><Lock className="size-3.5" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-4 space-y-4">
          <Card><CardContent className="p-6 space-y-4">
            <SectionTitle title="Profile photo" hint="Used across ALink everywhere your name appears." />
            <AvatarPicker value={draft.avatar} name={draft.name} onChange={(url) => setDraft({ ...draft, avatar: url })} />
          </CardContent></Card>

          <Card><CardContent className="p-6 grid md:grid-cols-2 gap-4">
            <SectionTitle title="Account information" full />
            <Field label="Display name">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Headline">
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="University">
              <Input value={draft.university} onChange={(e) => setDraft({ ...draft, university: e.target.value })} />
            </Field>
            <Field label="Major">
              <Input value={draft.major} onChange={(e) => setDraft({ ...draft, major: e.target.value })} />
            </Field>
            <Field label="Graduation year">
              <Input type="number" value={String(draft.graduationYear ?? "")} onChange={(e) => setDraft({ ...draft, graduationYear: Number(e.target.value) })} />
            </Field>
            <Field label="Location">
              <Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Bio">
                <Textarea rows={4} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
              </Field>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-6 space-y-3">
            <SectionTitle title="Contact" />
            <Field label={<><Mail className="size-3.5 inline mr-1.5" />University email</>}>
              <Input
                value={draft?.institutionEmail ?? ""}
                onChange={(e) => setDraft((prev) => prev ? { ...prev, institutionEmail: e.target.value } : prev)}
                placeholder="you@university.edu"
              />
            </Field>
            <Field label={<><Phone className="size-3.5 inline mr-1.5" />Phone</>}>
              <Input
                value={draft?.phone ?? ""}
                onChange={(e) => setDraft((prev) => prev ? { ...prev, phone: e.target.value } : prev)}
                placeholder="+1 555 000 0000"
              />
            </Field>
          </CardContent></Card>

          <div className="flex justify-end">
            <Button onClick={saveAccount} className="gap-2 w-full md:w-auto justify-center"><Check className="size-4" /> Save account</Button>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4 space-y-4">
          <Card><CardContent className="p-6 space-y-5">
            <SectionTitle title="Theme" hint="Choose light, dark, or follow your system." />
            <div className="flex flex-wrap items-center gap-3">
              <ThemeSwitchPair />
              <Badge variant="outline" className="rounded-full">
                <Sparkles className="size-3" /> Active: <span className="capitalize ml-1">{theme}</span>
              </Badge>
            </div>

            <Separator />

            <SectionTitle title="Accent color" hint="Used for highlights, active states, and gradients." />
            <div className="flex flex-wrap gap-2">
              {(["violet","amber","mint","rose"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setP("accent", c)}
                  aria-label={`${c} accent`}
                  className={`size-8 rounded-full border-2 transition ${prefs.accent === c ? "border-foreground" : "border-transparent"}`}
                  style={{
                    background:
                      c === "violet" ? "linear-gradient(135deg,#7C5CFF,#B19BFF)" :
                      c === "amber" ? "linear-gradient(135deg,#F5B461,#FF6B8A)" :
                      c === "mint" ? "linear-gradient(135deg,#5DE0B0,#7C5CFF)" :
                      "linear-gradient(135deg,#FF6B8A,#F5B461)",
                  }}
                />
              ))}
            </div>

            <Separator />

            <SectionTitle title="Density" hint="Adjust spacing across cards and tables." />
            <div className="inline-flex p-1 rounded-full border border-border bg-card">
              {(["comfortable","compact"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setP("density", d)}
                  className={`relative px-3 h-8 rounded-full text-xs capitalize transition ${prefs.density === d ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {prefs.density === d && (
                    <motion.span layoutId="densityPill" className="absolute inset-0 rounded-full brand-gradient -z-0" transition={{ type: "spring", stiffness: 240, damping: 22 }} />
                  )}
                  <span className="relative z-10">{d}</span>
                </button>
              ))}
            </div>

            <Separator />

            <Toggle label="Reduce motion" sub="Honor your preference for fewer animations." checked={prefs.reduceMotion} onChange={(v) => setP("reduceMotion", v)} />
          </CardContent></Card>

          <Card><CardContent className="p-6 space-y-4">
            <SectionTitle title="Language & region" />
            <Field label={<><Languages className="size-3.5 inline mr-1.5" />Language</>}>
              <select
                value={prefs.language}
                onChange={(e) => setP("language", e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm"
              >
                {["English","Español","Français","Deutsch","日本語","中文","हिन्दी"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card><CardContent className="p-6 space-y-4">
            <SectionTitle title="Email" />
            <Toggle label="Weekly digest" sub="Curated picks every Monday." checked={prefs.emailDigest} onChange={(v) => setP("emailDigest", v)} />
            <Separator />
            <Toggle label="Product updates" sub="Major releases & feature drops." checked={prefs.productUpdates} onChange={(v) => setP("productUpdates", v)} />
          </CardContent></Card>

          <Card><CardContent className="p-6 space-y-4">
            <SectionTitle title="Activity" />
            <Toggle label="Booking reminders" sub="30 min before each scheduled session." checked={prefs.bookingReminders} onChange={(v) => setP("bookingReminders", v)} />
            <Separator />
            <Toggle label="Message pings" sub="Push & desktop notifications for chats." checked={prefs.messagePings} onChange={(v) => setP("messagePings", v)} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-4 space-y-4">
          <Card><CardContent className="p-6 space-y-4">
            <SectionTitle title="Visibility" />
            <Toggle label="Show me in the directory" sub="Toggle off to hide from finder & search." checked={prefs.showInDirectory} onChange={(v) => setP("showInDirectory", v)} />
            <Separator />
            <Toggle label="Open to mentorship" sub="Allow consultation requests from students." checked={prefs.openToMentorship} onChange={(v) => setP("openToMentorship", v)} />
            <Separator />
            <Toggle label="Open to referral requests" sub="Receive referral pings tied to your company." checked={prefs.openToReferrals} onChange={(v) => setP("openToReferrals", v)} />
          </CardContent></Card>

          <Card><CardContent className="p-6 space-y-3">
            <SectionTitle title="Data" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast.success("Export queued — we'll email you a ZIP")}>
                <Download className="size-4" /> Export my data
              </Button>
              <Button variant="outline" onClick={() => toast("Cookies cleared")}>
                <Globe className="size-4" /> Clear cookies
              </Button>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card><CardContent className="p-6 space-y-4">
            <SectionTitle title="Sign-in" />
            <Toggle label="Two-factor authentication" sub="Authenticator app for an extra step at login." checked={prefs.twoFactor} onChange={(v) => { setP("twoFactor", v); toast(v ? "2FA enabled" : "2FA disabled"); }} />
            <Separator />
            <Field label={<><KeyRound className="size-3.5 inline mr-1.5" />Change password</>}>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                />
              </div>
              <div className="mt-2">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  variant="outline"
                  onClick={changePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                >
                  Update password
                </Button>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-[var(--rose)] mt-2">Passwords do not match.</p>
              )}
            </Field>
          </CardContent></Card>

          <Card><CardContent className="p-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm">Sessions</div>
              <p className="text-xs text-muted-foreground">You're signed in on this device.</p>
            </div>
            <Button variant="outline" onClick={() => { logout(); }}><LogOut className="size-4" /> Sign out everywhere</Button>
          </CardContent></Card>

          <Card><CardContent className="p-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <strong className="text-[var(--rose)]">Delete account</strong>
              <p className="text-sm text-muted-foreground">Permanent. Your profile, messages, and bookings will be removed.</p>
            </div>
            <Button variant="destructive" onClick={() => toast.error("Please contact support to confirm deletion")}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionTitle({ title, hint, full }: { title: string; hint?: string; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <h3 className="font-serif text-xl">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
