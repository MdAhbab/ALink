import * as React from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useAuth } from "../lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import {
  Camera, Check, CheckCircle2, Pencil, ShieldCheck, X, Plus, MapPin,
  GraduationCap, Linkedin, Github, Globe, Mail, Sparkles, UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest, getAuthToken } from "../lib/api";
import { AvatarPicker } from "../components/profile/AvatarPicker";

export default function Profile() {
  const { user, update } = useAuth();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(user!);
  const [skillDraft, setSkillDraft] = React.useState("");
  const [avatarOpen, setAvatarOpen] = React.useState(false);
  const coverRef = React.useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: coverRef, offset: ["start start", "end start"] });
  const coverY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);
  const shineX = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60]);
  const blobY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -30]);
  if (!user) return null;

  const save = () => {
    update(draft);
    setEditing(false);
    toast.success("Profile updated", { description: "Your changes are visible to others." });
  };

  const cancel = () => { setDraft(user); setEditing(false); };

  const addSkill = () => {
    const v = skillDraft.trim();
    if (!v || draft.skills.includes(v)) return;
    setDraft({ ...draft, skills: [...draft.skills, v] });
    setSkillDraft("");
  };
  const removeSkill = (s: string) =>
    setDraft({ ...draft, skills: draft.skills.filter((x) => x !== s) });

  return (
    <div className="space-y-6">
      {/* Cover + header */}
      <motion.div ref={coverRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-border">
        <div className="h-40 brand-gradient relative overflow-hidden">
          <motion.div aria-hidden style={{ y: coverY, x: shineX }} className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_20%,rgba(255,255,255,0.35),transparent)]" />
          <motion.div aria-hidden style={{ y: blobY }} className="absolute -right-10 -top-10 size-48 rounded-full bg-white/15 blur-2xl" />
        </div>
        <div className="-mt-16 px-6 pb-6 flex flex-col md:flex-row gap-5 md:items-end bg-card">
          <div className="relative shrink-0">
            <Avatar className="size-32 ring-4 ring-card">
              <AvatarImage src={(editing ? draft : user).avatar} />
              <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            {editing && (
              <button
                onClick={() => setAvatarOpen(true)}
                className="absolute bottom-1 right-1 size-9 grid place-items-center rounded-full brand-gradient text-white shadow-md hover:scale-105 transition"
                aria-label="Change photo"
              >
                <Camera className="size-4" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-4xl">{(editing ? draft : user).name}</h1>
              {user.verified ? (
                <Badge className="gap-1"><CheckCircle2 className="size-3" /> Verified</Badge>
              ) : (
                <Badge variant="outline" className="gap-1"><ShieldCheck className="size-3" /> Verification pending</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {(editing ? draft : user).title}{(editing ? draft.company : user.company) ? ` · ${editing ? draft.company : user.company}` : ""}
            </p>
            <p className="text-sm text-muted-foreground inline-flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1.5"><GraduationCap className="size-3.5" />{(editing ? draft : user).university}{user.graduationYear ? ` · Class of ${user.graduationYear}` : ""}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{(editing ? draft : user).location}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <Button onClick={() => { setDraft(user); setEditing(true); }} className="gap-2">
                <Pencil className="size-4" /> Edit profile
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={cancel}><X className="size-4" /> Cancel</Button>
                <Button onClick={save} className="gap-2"><Check className="size-4" /> Save</Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <Field label="Display name">
                {editing ? <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /> : <Value>{user.name}</Value>}
              </Field>
              <Field label="Headline">
                {editing ? <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. B.S. Junior, Computer Science" /> : <Value>{user.title}</Value>}
              </Field>
              <Field label="Bio">
                {editing ? (
                  <Textarea rows={4} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
                ) : (
                  <Value>{user.bio}</Value>
                )}
              </Field>
              <Field label="Location">
                {editing ? <Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /> : <Value>{user.location}</Value>}
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-serif text-2xl">Skills & interests</h3>
              {editing ? (
                <>
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={skillDraft}
                      onChange={(e) => setSkillDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                      placeholder="Add a skill"
                    />
                    <Button variant="outline" onClick={addSkill}><Plus className="size-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {draft.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="rounded-full gap-1">
                        {s}
                        <button onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}><X className="size-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {user.skills.map((s) => <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>)}
                </div>
              )}
              <Separator className="my-5" />
              <h3 className="font-serif text-2xl">Open to</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>· Mentorship</li>
                <li>· Coffee chats</li>
                <li>· Referral requests</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-5">
              <Field label="University">
                {editing ? <Input value={draft.university} onChange={(e) => setDraft({ ...draft, university: e.target.value })} /> : <Value>{user.university}</Value>}
              </Field>
              <Field label="Major">
                {editing ? <Input value={draft.major} onChange={(e) => setDraft({ ...draft, major: e.target.value })} /> : <Value>{user.major}</Value>}
              </Field>
              <Field label="Graduation year">
                {editing ? (
                  <Input type="number" min={1960} max={2035} value={String(draft.graduationYear ?? "")} onChange={(e) => setDraft({ ...draft, graduationYear: Number(e.target.value) })} />
                ) : (
                  <Value>{user.graduationYear ?? "—"}</Value>
                )}
              </Field>
              <Field label="GPA (private)">
                {editing ? <Input placeholder="3.8" /> : <Value>3.8</Value>}
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-5">
              <Field label="Title">
                {editing ? <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /> : <Value>{user.title}</Value>}
              </Field>
              <Field label="Company">
                {editing ? <Input value={draft.company ?? ""} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /> : <Value>{user.company ?? "—"}</Value>}
              </Field>
              <Field label="Industry">
                {editing ? <Input value={draft.industry ?? ""} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} /> : <Value>{user.industry ?? "—"}</Value>}
              </Field>
              <Field label="Open to">
                <div className="flex flex-wrap gap-2">
                  {["Mentorship", "Referrals", "Coffee chats", "Hiring"].map((t) => (
                    <Badge key={t} variant="outline" className="rounded-full">{t}</Badge>
                  ))}
                </div>
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-2 gap-5">
              <LinkField icon={Mail} label="Email" placeholder="you@university.edu" editing={editing} />
              <LinkField icon={Linkedin} label="LinkedIn" placeholder="linkedin.com/in/you" editing={editing} />
              <LinkField icon={Github} label="GitHub" placeholder="github.com/you" editing={editing} />
              <LinkField icon={Globe} label="Website" placeholder="you.dev" editing={editing} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <VerificationPanel user={user} />
        </TabsContent>
      </Tabs>

      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose your photo</DialogTitle>
            <DialogDescription>Upload your own or pick from generated avatars.</DialogDescription>
          </DialogHeader>
          <AvatarPicker
            value={draft.avatar}
            name={draft.name}
            onChange={(url) => setDraft({ ...draft, avatar: url })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAvatarOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
function Value({ children }: { children: React.ReactNode }) {
  return <div className="text-sm whitespace-pre-line">{children}</div>;
}

function LinkField({ icon: Icon, label, placeholder, editing }: { icon: any; label: string; placeholder: string; editing: boolean }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-10">
        <Icon className="size-4 text-muted-foreground shrink-0" />
        {editing ? (
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder={placeholder} />
        ) : (
          <span className="flex-1 text-sm text-muted-foreground">{placeholder}</span>
        )}
      </div>
    </Field>
  );
}

function Row({ icon: Icon, ok, label }: { icon: any; ok?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <Icon className={`size-4 ${ok ? "text-[var(--mint)]" : "text-muted-foreground"}`} />
      <span>{label}</span>
      {ok && <Badge variant="outline" className="ml-auto">Done</Badge>}
    </div>
  );
}

function VerificationPanel({ user }: { user: any }) {
  const [verifications, setVerifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [idCardFile, setIdCardFile] = React.useState<File | null>(null);
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);

  const fetchVerifs = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<any[]>("/verifications/me", { token });
      setVerifications(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchVerifs(); }, [fetchVerifs]);

  const pending = verifications.find(v => v.status === "pending");

  const handleSubmit = async () => {
    if (!idCardFile || !resumeFile) {
      toast.error("Please select both an ID card and a resume");
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    
    setIsUploading(true);
    try {
      // 1. Create request
      const reqRes = await apiRequest<any>("/verifications/request", { method: "POST", token });
      const vid = reqRes.id;

      // 2. Upload ID card
      const idFormData = new FormData();
      idFormData.append("file", idCardFile);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:8000";
      const idUploadRes = await fetch(`${apiBase}/api/uploads/id-card`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: idFormData
      });
      if (!idUploadRes.ok) throw new Error("ID Card upload failed");
      const idUploadData = await idUploadRes.json();

      // 3. Upload Resume
      const resumeFormData = new FormData();
      resumeFormData.append("file", resumeFile);
      const resumeUploadRes = await fetch(`${apiBase}/api/uploads/resume`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: resumeFormData
      });
      if (!resumeUploadRes.ok) throw new Error("Resume upload failed");
      const resumeUploadData = await resumeUploadRes.json();

      // 4. Submit
      await apiRequest(`/verifications/${vid}/submit`, {
        method: "POST",
        token,
        body: { id_card_url: idUploadData.url, resume_url: resumeUploadData.url }
      });

      toast.success("Verification request submitted successfully");
      fetchVerifs();
    } catch (err: any) {
      toast.error("Failed to submit verification", { description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="size-7 text-[var(--brand-600)] dark:text-[var(--brand-300)]" />
          <div className="flex-1">
            <h3 className="font-serif text-2xl">Verification status</h3>
            <p className="text-muted-foreground">Verified members are highlighted in directory and command palette.</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm mb-6">
              <Row icon={CheckCircle2} ok label="University email confirmed" />
              <Row icon={CheckCircle2} ok={user.verified} label="ID verified" />
              <Row icon={Sparkles} label="Optional: LinkedIn link" />
            </div>

            {!loading && !user.verified && !pending && (
              <div className="space-y-4 max-w-md bg-muted/30 p-4 rounded-xl border border-border">
                <h4 className="font-medium">Submit documents for verification</h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Student/Alumni ID Card (Image)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Resume (PDF or Image)</Label>
                    <Input type="file" accept="application/pdf,image/*" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                  </div>
                  <Button onClick={handleSubmit} disabled={isUploading || !idCardFile || !resumeFile} className="w-full gap-2">
                    {isUploading ? "Uploading..." : <><UploadCloud className="size-4" /> Submit for review</>}
                  </Button>
                </div>
              </div>
            )}

            {!loading && pending && (
              <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 p-4 rounded-xl text-sm inline-block">
                Your verification request is currently under review.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
