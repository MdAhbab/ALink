import * as React from "react";
import { motion } from "motion/react";
import { apiRequest, apiRequestAll, getAuthToken } from "../lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Calendar, Sparkles, Users, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Mentorship() {
  const [mentorPrograms, setMentorPrograms] = React.useState<any[]>([]);
  const [people, setPeople] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 relative overflow-hidden">
        <div aria-hidden className="absolute -top-16 -left-10 size-60 rounded-full opacity-20 blur-3xl" style={{ background: "var(--amber)" }} />
        <Badge variant="secondary" className="rounded-full"><Sparkles className="size-3" /> Curated programs</Badge>
        <h1 className="font-serif text-4xl md:text-5xl mt-3">Mentorship programs</h1>
        <p className="text-muted-foreground">Long-arc cohorts, office hours, and one-on-one tracks led by verified alumni.</p>
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
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {p.filled}/{p.spots} enrolled</span>
                      <span className="text-muted-foreground">{Math.max(0, p.spots - p.filled)} left</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div className="h-full brand-gradient" initial={{ width: 0 }} animate={{ width: `${fillPct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <Badge className="rounded-full" variant={p.price === "Free" ? "secondary" : "default"}>{p.price}</Badge>
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
                  </div>
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
