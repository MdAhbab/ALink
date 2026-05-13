import * as React from "react";
import { motion } from "motion/react";
import { useAuth } from "../lib/auth";
import { apiRequest, getAuthToken } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Calendar, MapPin, Users, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";

const kindLabel: Record<string, string> = {
  panel: "Panel", mixer: "Mixer", workshop: "Workshop", career_fair: "Career Fair",
};

export default function Events() {
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<string>("all");
  const [events, setEvents] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchEvents = React.useCallback(async (signal?: AbortSignal) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<any[]>("/events", { token, signal });
      setEvents(data);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Failed to load events", { description: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetchEvents(controller.signal);
    return () => controller.abort();
  }, [fetchEvents]);

  const filtered = events.filter(e => filter === "all" || e.kind === filter);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div aria-hidden className="absolute -top-16 -right-10 size-60 rounded-full brand-gradient opacity-20 blur-3xl" />
        <div className="relative z-10">
          <Badge variant="secondary" className="rounded-full"><Sparkles className="size-3" /> What's on this week</Badge>
          <h1 className="font-serif text-4xl md:text-5xl mt-3">Events &amp; meetups</h1>
          <p className="text-muted-foreground">Panels, mixers, workshops, and career fairs — IRL and online.</p>
        </div>
        {(user?.role === "admin" || user?.role === "alumni") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 relative z-10"><Plus className="size-4" /> Create event</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create new event</DialogTitle></DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await apiRequest("/events", {
                    method: "POST",
                    token: getAuthToken() || undefined,
                    body: {
                      title: fd.get("title"),
                      kind: fd.get("kind"),
                      date: fd.get("date"),
                      time: fd.get("time"),
                      location: fd.get("location"),
                      host: user?.name,
                      cover: "#7C5CFF",
                      capacity: Number(fd.get("capacity")) || 0,
                      tags: []
                    }
                  });
                  toast.success("Event created successfully");
                  setOpen(false);
                  fetchEvents();
                } catch (err: any) {
                  toast.error("Failed to create event", { description: err.message });
                }
              }} className="space-y-4 mt-4">
                <div className="space-y-1.5"><Label>Title</Label><Input name="title" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <select name="kind" className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm">
                      <option value="panel">Panel</option>
                      <option value="mixer">Mixer</option>
                      <option value="workshop">Workshop</option>
                      <option value="career_fair">Career Fair</option>
                    </select>
                  </div>
                  <div className="space-y-1.5"><Label>Capacity</Label><Input name="capacity" type="number" defaultValue="50" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Date</Label><Input name="date" type="date" required /></div>
                  <div className="space-y-1.5"><Label>Time</Label><Input name="time" type="time" required /></div>
                </div>
                <div className="space-y-1.5"><Label>Location</Label><Input name="location" required /></div>
                <Button type="submit" className="w-full">Create Event</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="panel">Panels</TabsTrigger>
          <TabsTrigger value="mixer">Mixers</TabsTrigger>
          <TabsTrigger value="workshop">Workshops</TabsTrigger>
          <TabsTrigger value="career_fair">Career fairs</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading && (
              <div className="col-span-full py-16 text-center text-muted-foreground">Loading events...</div>
            )}
            {filtered.length > 0 ? filtered.map((e, i) => (
              <motion.div key={e.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3 }}>
                <Card className="overflow-hidden h-full">
                  <div className="h-28 relative grid place-items-center text-white font-serif text-3xl" style={{ background: `linear-gradient(135deg, ${e.cover}, ${e.cover}55)` }}>
                    <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_30%,rgba(255,255,255,0.35),transparent)]" />
                    {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                  <CardContent className="p-5">
                    <Badge variant="outline" className="rounded-full">{kindLabel[e.kind]}</Badge>
                    <div className="font-serif text-xl mt-2">{e.title}</div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <div className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" /> {e.date} · {e.time}</div>
                      <div className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {e.location}</div>
                      <div className="inline-flex items-center gap-1.5"><Users className="size-3.5" /> {e.attending} / {e.capacity}</div>
                    </div>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div className="h-full brand-gradient" initial={{ width: 0 }} animate={{ width: `${(e.attending/e.capacity)*100}%` }} transition={{ duration: 0.8, delay: 0.2 + i*0.04 }} />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Hosted by {e.host}</div>
                      <Button size="sm" onClick={async () => {
                        try {
                          await apiRequest(`/events/${e.id}/rsvp`, { method: "POST", token: getAuthToken() || undefined });
                          toast.success(`You're going to ${e.title}`);
                          fetchEvents();
                        } catch (err: any) {
                          toast.error("Failed to RSVP", { description: err.message });
                        }
                      }}>RSVP</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )) : (!isLoading && <div className="col-span-full py-16 text-center text-muted-foreground">No events found.</div>)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
