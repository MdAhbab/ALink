import * as React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { apiRequest, apiRequestAll, getAuthToken } from "../lib/api";
import { openDirectThread, openGroupThread } from "../lib/chat";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Calendar, Sparkles, Users, Clock, Plus, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Mentorship() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mentorPrograms, setMentorPrograms] = React.useState<any[]>([]);
  const [people, setPeople] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    const token = getAuthToken();
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      apiRequest<any[]>("/mentorship/programs", { token, signal: controller.signal }).then(setMentorPrograms).catch(() => {}),
      apiRequestAll<any>("/users", { token, signal: controller.signal }).then(setPeople).catch(() => {}),
    ])
      .catch((err: any) => {
        if (err?.name !== "AbortError") {
          toast.error("Failed to load mentorship data", { description: err.message });
        }
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  const openMessage = async (id: string, name: string) => {
    try {
      const thread = await openDirectThread(id);
      toast.success(`Opened conversation with ${name}`);
      nav(`/app/inbox?thread=${encodeURIComponent(thread.id)}`);
    } catch (err: any) {
      toast.error("Failed to open message", { description: err.message });
    }
  };

  const openGroupMessage = async (ids: string[], title: string, programId?: string) => {
    try {
      const thread = await openGroupThread(ids, title, programId);
      toast.success("Opened group conversation with applicants");
      nav(`/app/inbox?thread=${encodeURIComponent(thread.id)}`);
    } catch (err: any) {
      toast.error("Failed to open message group", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div aria-hidden className="absolute -top-16 -left-10 size-60 rounded-full opacity-20 blur-3xl" style={{ background: "var(--amber)" }} />
        <div className="relative z-10 space-y-1">
          <Badge variant="secondary" className="rounded-full"><Sparkles className="size-3" /> Curated programs</Badge>
          <h1 className="font-serif text-4xl md:text-5xl mt-3">Mentorship programs</h1>
          <p className="text-muted-foreground">Long-arc cohorts, office hours, and one-on-one tracks led by verified alumni.</p>
        </div>
        {(user?.role === "admin" || user?.role === "alumni") && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 relative z-10"><Plus className="size-4" /> Create program</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create mentorship program</DialogTitle>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const focusInput = String(fd.get("focus") || "");
                const focusList = focusInput.split(",").map(f => f.trim()).filter(Boolean);
                try {
                  const newProg = await apiRequest<any>("/mentorship/programs", {
                    method: "POST",
                    token: getAuthToken() || undefined,
                    body: {
                      title: fd.get("title"),
                      duration: fd.get("duration"),
                      cadence: fd.get("cadence"),
                      spots: Number(fd.get("spots")) || 0,
                      focus: focusList,
                      price: fd.get("price"),
                      startDate: fd.get("startDate"),
                    }
                  });
                  toast.success("Mentorship program created successfully");
                  setMentorPrograms(prev => [newProg, ...prev]);
                  setIsOpen(false);
                } catch (err: any) {
                  toast.error("Failed to create program", { description: err.message });
                }
              }} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Program Title</Label>
                  <Input id="title" name="title" placeholder="e.g. Systems Design Masterclass" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="duration">Duration</Label>
                    <Input id="duration" name="duration" placeholder="e.g. 3 months" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cadence">Meeting Cadence</Label>
                    <Input id="cadence" name="cadence" placeholder="e.g. Weekly on Thu" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="spots">Max Spots</Label>
                    <Input id="spots" name="spots" type="number" min="1" defaultValue="5" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price Model</Label>
                    <select id="price" name="price" className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm">
                      <option value="Free">Free</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Program Start Date</Label>
                    <Input id="startDate" name="startDate" type="date" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="focus">Focus Areas</Label>
                  <Input id="focus" name="focus" placeholder="e.g. Design, Frontend, Careers" required />
                  <p className="text-[10px] text-muted-foreground">Separate multiple focus areas with commas.</p>
                </div>
                <Button type="submit" className="w-full">Create Cohort</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <div className="md:col-span-2 lg:col-span-3 text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border">
            Loading mentorship programs...
          </div>
        )}
        {mentorPrograms.map((p, i) => {
          const fillPct = (p.filled / p.spots) * 100;
          return (
            <motion.div key={p.id} whileHover={{ y: -4 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12"><AvatarImage src={p.mentor?.avatar} /><AvatarFallback>{p.mentor?.name?.[0]}</AvatarFallback></Avatar>
                    <div>
                      <div className="text-sm">{p.mentor?.name}</div>
                      <div className="text-xs text-muted-foreground">{p.mentor?.title}</div>
                    </div>
                  </div>
                  <div className="font-serif text-2xl mt-4">{p.title}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.focus?.map((f: string) => <Badge key={f} variant="outline" className="rounded-full">{f}</Badge>)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/50 p-2.5"><Clock className="size-3.5 inline mr-1 text-muted-foreground" /> {p.duration}</div>
                    <div className="rounded-lg bg-muted/50 p-2.5"><Calendar className="size-3.5 inline mr-1 text-muted-foreground" /> {p.cadence}</div>
                  </div>
                  {p.startDate && (
                    <div className="mt-3 text-xs text-muted-foreground">Starts {p.startDate}</div>
                  )}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {p.filled}/{p.spots} enrolled</span>
                      <span className="text-muted-foreground">{Math.max(0, p.spots - p.filled)} left</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div className="h-full brand-gradient" initial={{ width: 0 }} animate={{ width: `${fillPct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <Badge className="rounded-full" variant={p.price === "Free" ? "secondary" : "default"}>{p.price}</Badge>
                    {user?.id !== p.mentor?.id ? (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await apiRequest(`/mentorship/programs/${p.id}/apply`, {
                              method: "POST",
                              token: getAuthToken() || undefined,
                            });
                            toast.success(`Applied to ${p.title}`);
                            setMentorPrograms((current) =>
                              current.map((x) => x.id === p.id ? { ...x, filled: Math.min(x.spots, (x.filled ?? 0) + 1) } : x)
                            );
                          } catch (err: any) {
                            toast.error("Failed to apply", { description: err.message });
                          }
                        }}
                      >
                        Apply
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        Your program
                      </Button>
                    )}
                  </div>
                  {user?.id === p.mentor?.id && p.applications?.length > 0 && (
                    <div className="mt-6 rounded-3xl border border-border/70 bg-muted/70 p-6 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold">Enrolled participants</div>
                          <div className="text-xs text-muted-foreground">{p.applications.length} applicant{p.applications.length === 1 ? "" : "s"}</div>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-end">
                          <Button size="xs" variant="outline" className="min-w-[9rem]" onClick={() => nav(`/app/mentorship/${p.id}/applicants`)}>
                            View applicants
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            className="min-w-[9rem]"
                            onClick={() => openGroupMessage(
                              p.applications.map((app: any) => app.applicant.id),
                              `Applicants for ${p.title}`,
                              p.id,
                            )}
                          >
                            Message applicants
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {!isLoading && mentorPrograms.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border">
            No mentorship programs available.
          </div>
        )}
      </div>

      {/* Office hours strip */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl">Drop-in office hours</h3>
          <Badge variant="outline" className="rounded-full">No booking needed</Badge>
        </div>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {people.filter(p => p.role === "alumni" && p.open).map(p => (
            <div key={p.id} className="rounded-xl border border-border p-3 text-center hover:bg-muted/40 transition">
              <Avatar className="size-12 mx-auto"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
              <div className="text-sm mt-2">{p.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{p.company}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--mint)]">
                <span className="size-1.5 rounded-full bg-[var(--mint)]" /> Online · Fri 3–4pm
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
