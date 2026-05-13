import * as React from "react";
import { motion } from "motion/react";
import { apiRequest, getAuthToken } from "../lib/api";
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
import { useSearchParams } from "react-router";

const status: Record<string, { label: string; cls: string }> = {
  upcoming: { label: "Upcoming", cls: "bg-[color:var(--brand-100)] text-[color:var(--brand-800)]" },
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-800" },
};

export default function Bookings() {
  const [params, setParams] = useSearchParams();
  const [openNew, setOpenNew] = React.useState(params.get("new") === "1");
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [people, setPeople] = React.useState<any[]>([]);

  const fetchData = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const [b, p] = await Promise.all([
        apiRequest<any[]>("/bookings", { token }),
        apiRequest<any[]>("/users", { token })
      ]);
      setBookings(b);
      setPeople(p);
    } catch {}
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData]);
  React.useEffect(() => { if (params.get("new") === "1") setOpenNew(true); }, [params]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Consultations</h1>
          <p className="text-muted-foreground">Schedule, manage, and join your sessions.</p>
        </div>
        <Dialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (!v) setParams({}); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" /> New session</Button></DialogTrigger>
          <NewBooking people={people} onClose={() => setOpenNew(false)} />
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
                          <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {b.date}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {b.time} · {b.duration}m</span>
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
              {bookings.filter(b => b.status === s).length === 0 && (
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

function NewBooking({ people, onClose }: { people: any[]; onClose: () => void }) {
  const [withId, setWithId] = React.useState(people[0]?.id || "");
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">Book a session</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="space-y-1.5">
          <Label>Mentor</Label>
          <Select value={withId} onValueChange={setWithId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {people.filter(p => p.role === "alumni").map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.company}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Topic</Label>
          <Input placeholder="What would you like to discuss?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input type="time" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Context (optional)</Label>
          <Textarea rows={3} placeholder="Anything they should review beforehand?" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { toast.success("Session requested"); onClose(); }}>Send request</Button>
      </DialogFooter>
    </DialogContent>
  );
}
