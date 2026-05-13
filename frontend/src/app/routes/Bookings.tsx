import * as React from "react";
import { motion } from "motion/react";
import { apiRequest, apiRequestAll, getAuthToken } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar, Clock, Link as LinkIcon, Plus, Video } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";

const status: Record<string, { label: string; cls: string }> = {
  upcoming: { label: "Upcoming", cls: "bg-[color:var(--brand-100)] text-[color:var(--brand-800)]" },
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-800" },
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bookingDate(b: any) {
  return b.startsAt ? ymd(new Date(b.startsAt)) : b.date;
}

function bookingTime(b: any) {
  if (!b.startsAt) return b.time;
  const d = new Date(b.startsAt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Bookings() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [openNew, setOpenNew] = React.useState(params.get("new") === "1");
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [people, setPeople] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async (signal?: AbortSignal) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const [b, p] = await Promise.all([
        apiRequestAll<any>("/bookings", { token, signal }),
        apiRequestAll<any>("/users?role=alumni", { token, signal })
      ]);
      setBookings(b);
      setPeople(p);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Failed to load bookings", { description: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);
  React.useEffect(() => { if (params.get("new") === "1") setOpenNew(true); }, [params]);

  const initialWithId = params.get("withId") ?? "";
  const initialTopic = params.get("topic") ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Consultations</h1>
          <p className="text-muted-foreground">Schedule, manage, and join your sessions.</p>
        </div>
        <Dialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (!v) setParams({}); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" /> New session</Button></DialogTrigger>
          <NewBooking
            people={people}
            initialWithId={initialWithId}
            initialTopic={initialTopic}
            onClose={() => setOpenNew(false)}
            onCreated={() => {
              fetchData();
              nav("/app/bookings", { replace: true });
            }}
          />
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">History</TabsTrigger>
        </TabsList>

        {["upcoming","pending","completed"].map((s) => (
          <TabsContent key={s} value={s}>
            <div className="grid md:grid-cols-2 gap-4">
              {isLoading && (
                <div className="md:col-span-2 text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border">
                  Loading sessions...
                </div>
              )}
              {bookings.filter(b => b.status === s).map(b => (
                <motion.div layout key={b.id}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-12"><AvatarImage src={b.with?.avatar} /><AvatarFallback>{b.with?.name?.[0]}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">{b.with?.name}</div>
                          <div className="text-xs text-muted-foreground">{b.with?.title}{b.with?.company ? ` · ${b.with?.company}` : ""}</div>
                        </div>
                        <Badge className={status[b.status]?.cls}>{status[b.status]?.label}</Badge>
                      </div>

                      <div className="mt-4">
                        <div className="font-serif text-xl">{b.topic}</div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
                          <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {bookingDate(b)}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {bookingTime(b)} · {b.duration}m</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {b.status === "upcoming" && b.meetingLink && (
                          <Button size="sm" className="gap-2" onClick={() => window.open(b.meetingLink, "_blank")}>
                            <Video className="size-3.5" /> Join meeting
                          </Button>
                        )}
                        {b.status === "upcoming" && (
                          <>
                            <Button size="sm" variant="outline">Reschedule</Button>
                            <Button size="sm" variant="ghost">Cancel</Button>
                          </>
                        )}
                        {b.status === "pending" && (
                          <Button size="sm" variant="outline">Withdraw request</Button>
                        )}
                        {b.status === "completed" && (
                          <Button size="sm" variant="outline">Leave feedback</Button>
                        )}
                      </div>

                      {b.meetingLink && b.status === "upcoming" && (
                        <div className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1"><LinkIcon className="size-3" /> {b.meetingLink}</div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {!isLoading && bookings.filter(b => b.status === s).length === 0 && (
                <div className="md:col-span-2 text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border">
                  Nothing here yet.
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function NewBooking({
  people,
  initialWithId,
  initialTopic,
  onClose,
  onCreated,
}: {
  people: any[];
  initialWithId: string;
  initialTopic: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [withId, setWithId] = React.useState(initialWithId || people[0]?.id || "");
  const [topic, setTopic] = React.useState(initialTopic);
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [duration, setDuration] = React.useState("30");
  const [context, setContext] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const fallback = people[0]?.id ?? "";
    setWithId(initialWithId || fallback);
  }, [people, initialWithId]);

  React.useEffect(() => {
    setTopic(initialTopic);
  }, [initialTopic]);

  const submit = async () => {
    if (!withId || !topic.trim() || !date || !time) {
      toast.error("Please complete all required fields");
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await apiRequest("/bookings", {
        method: "POST",
        token,
        body: {
          withId,
          topic: topic.trim(),
          date,
          time,
          duration: Number(duration),
          startsAt: new Date(`${date}T${time}`).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      toast.success("Session requested");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error("Could not request session", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">Book a session</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="space-y-1.5">
          <Label>Mentor</Label>
          <Select value={withId} onValueChange={setWithId}>
            <SelectTrigger><SelectValue placeholder="Select a mentor" /></SelectTrigger>
            <SelectContent>
              {people.filter(p => p.role === "alumni").map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.company}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Topic</Label>
          <Input placeholder="What would you like to discuss?" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Duration (minutes)</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Context (optional)</Label>
          <Textarea
            rows={3}
            placeholder="Anything they should review beforehand?"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={submitting || !withId || !topic.trim() || !date || !time}>Send request</Button>
      </DialogFooter>
    </DialogContent>
  );
}
