import * as React from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Video, MapPin,
  Plus, Check, RefreshCw, Trash2, ExternalLink,
} from "lucide-react";
import { apiRequest, apiRequestAll, getAuthToken } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { toast } from "sonner";

export type Booking = {
  id: string;
  topic: string;
  with: any;
  date: string;
  time: string;
  duration: number;
  status: "upcoming" | "pending" | "completed" | "cancelled";
  meetingLink?: string;
  startsAt?: string;
};

type DayItem =
  | { kind: "booking"; id: string; date: string; time: string; title: string; subtitle?: string; status: Booking["status"]; ref: Booking }
  | { kind: "event"; id: string; date: string; time: string; title: string; subtitle?: string; cover: string };

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function localBookingDate(b: Booking) {
  return b.startsAt ? ymd(new Date(b.startsAt)) : b.date;
}
function localBookingTime(b: Booking) {
  if (!b.startsAt) return b.time;
  const d = new Date(b.startsAt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }

const statusTone: Record<Booking["status"], string> = {
  upcoming: "bg-[var(--mint)]/20 text-[var(--mint)] border-[var(--mint)]/40",
  pending: "bg-[var(--peach)]/20 text-[var(--peach)] border-[var(--peach)]/40",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-[var(--rose)]/15 text-[var(--rose)] border-[var(--rose)]/40",
};

export default function CalendarRoute() {
  const nav = useNavigate();
  const today = new Date();
  const [cursor, setCursor] = React.useState<Date>(startOfMonth(today));
  const [selected, setSelected] = React.useState<Date>(today);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [editing, setEditing] = React.useState<Booking | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return () => controller.abort();
    }
    setIsLoading(true);
    Promise.all([
      apiRequestAll<Booking>("/bookings", { token, signal: controller.signal }).then(setBookings).catch(() => {}),
      apiRequest<any[]>("/events", { token, signal: controller.signal }).then(setEvents).catch(() => {}),
    ])
      .catch((err: any) => {
        if (err?.name !== "AbortError") {
          toast.error("Failed to load calendar", { description: err.message });
        }
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  const items: DayItem[] = React.useMemo(() => {
    const b: DayItem[] = bookings.map((x) => ({
      kind: "booking", id: x.id, date: localBookingDate(x), time: localBookingTime(x),
      title: x.topic, subtitle: `with ${x.with?.name} · ${x.duration}m`,
      status: x.status, ref: x,
    }));
    const e: DayItem[] = events.map((x) => ({
      kind: "event", id: x.id, date: x.date, time: x.time,
      title: x.title, subtitle: x.location, cover: x.cover,
    }));
    return [...b, ...e];
  }, [bookings, events]);

  const byDay = React.useMemo(() => {
    const m: Record<string, DayItem[]> = {};
    for (const it of items) (m[it.date] ||= []).push(it);
    return m;
  }, [items]);

  const cells = React.useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const list: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(first); d.setDate(d.getDate() - (startWeekday - i));
      list.push({ date: d, inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++)
      list.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i), inMonth: true });
    while (list.length % 7 !== 0) {
      const last = list[list.length - 1].date;
      const d = new Date(last); d.setDate(d.getDate() + 1);
      list.push({ date: d, inMonth: false });
    }
    return list;
  }, [cursor]);

  const selectedItems = byDay[ymd(selected)] || [];
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const updateBooking = (id: string, patch: Partial<Booking>) =>
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Schedule</div>
          <h1 className="font-serif text-4xl mt-1">Your calendar</h1>
          <p className="text-sm text-muted-foreground max-w-xl mt-1">
            All your consultations, mentor sessions, and events in one place. Tap any session to reschedule, join, or cancel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setCursor(startOfMonth(today)); setSelected(today); }}>
            <CalendarIcon className="size-4" /> Today
          </Button>
          <Button className="brand-gradient text-white border-0" onClick={() => nav("/app/bookings?new=1")}>
            <Plus className="size-4" /> New session
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <Card className="p-4 md:p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-2xl">{monthLabel}</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCursor(addMonths(cursor, -1))} className="size-9 grid place-items-center rounded-lg border border-border hover:bg-muted" aria-label="Previous month">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={() => setCursor(addMonths(cursor, 1))} className="size-9 grid place-items-center rounded-lg border border-border hover:bg-muted" aria-label="Next month">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="px-2 py-1.5 text-center">{d}</div>
            ))}
          </div>

          <LayoutGroup>
            <div className="grid grid-cols-7 gap-1">
              {cells.map(({ date, inMonth }) => {
                const key = ymd(date);
                const dayItems = byDay[key] || [];
                const isToday = isSameDay(date, today);
                const isSelected = isSameDay(date, selected);
                return (
                  <button
                    key={key + (inMonth ? "" : "-out")}
                    onClick={() => setSelected(date)}
                    className={`relative aspect-square rounded-xl border text-left p-1.5 transition-colors overflow-hidden ${
                      isSelected ? "border-[var(--brand-500)] bg-card" : "border-border hover:bg-muted/60 bg-card"
                    } ${!inMonth ? "opacity-40" : ""}`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="calSelected"
                        transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.7 }}
                        className="absolute inset-0 rounded-xl ring-2 ring-[var(--brand-500)]/60 pointer-events-none"
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isToday ? "size-6 grid place-items-center rounded-full brand-gradient text-white" : "text-foreground/80"}`}>
                        {date.getDate()}
                      </span>
                      {dayItems.length > 0 && <span className="text-[9px] text-muted-foreground">{dayItems.length}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayItems.slice(0, 4).map((it, i) => (
                        <span
                          key={i}
                          className={`size-1.5 rounded-full ${
                            it.kind === "event" ? "bg-[var(--peach)]" :
                            it.kind === "booking" && it.status === "upcoming" ? "bg-[var(--mint)]" :
                            it.kind === "booking" && it.status === "pending" ? "bg-[var(--brand-500)]" :
                            it.kind === "booking" && it.status === "cancelled" ? "bg-[var(--rose)]" :
                            "bg-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <Legend tone="bg-[var(--mint)]" label="Upcoming" />
            <Legend tone="bg-[var(--brand-500)]" label="Pending" />
            <Legend tone="bg-[var(--peach)]" label="Event" />
            <Legend tone="bg-[var(--rose)]" label="Cancelled" />
            <Legend tone="bg-muted-foreground" label="Completed" />
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Selected</div>
              <h3 className="font-serif text-2xl mt-1">
                {selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </h3>
            </div>
            <Badge variant="secondary">{selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}</Badge>
          </div>

          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-dashed border-border p-8 text-center"
              >
                <p className="text-sm text-muted-foreground">Loading day timeline...</p>
              </motion.div>
            ) : selectedItems.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-dashed border-border p-8 text-center"
              >
                <div className="mx-auto size-12 rounded-2xl bg-muted grid place-items-center mb-3">
                  <CalendarIcon className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm">Nothing scheduled</p>
                <p className="text-xs text-muted-foreground mt-1">Tap a date with a dot to see sessions.</p>
              </motion.div>
            ) : (
              <motion.ul key="list" className="space-y-2">
                {selectedItems.map((it, idx) => (
                  <motion.li
                    key={it.kind + it.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    {it.kind === "booking" ? (
                      <button
                        onClick={() => setEditing(it.ref)}
                        className="w-full text-left rounded-2xl border border-border bg-card hover:bg-muted/40 p-3 flex items-start gap-3 transition"
                      >
                        <Avatar className="size-10 mt-0.5">
                          <AvatarImage src={it.ref.with.avatar} alt={it.ref.with.name} />
                          <AvatarFallback>{it.ref.with.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm">{it.title}</span>
                            <Badge className={`border ${statusTone[it.status]} capitalize`} variant="outline">{it.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{it.subtitle}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <Clock className="size-3" /> {it.time}
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div className="rounded-2xl border border-border bg-card p-3 flex items-start gap-3">
                        <div className="size-10 rounded-xl shrink-0" style={{ background: it.cover }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">{it.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5"><MapPin className="size-3" /> {it.subtitle}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Clock className="size-3" /> {it.time}</div>
                        </div>
                        <Badge variant="outline">Event</Badge>
                      </div>
                    )}
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </Card>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-2xl">Up next</h3>
          <span className="text-xs text-muted-foreground">
            {bookings.filter((b) => b.status === "upcoming" || b.status === "pending").length} active
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading && (
            <div className="col-span-full text-sm text-muted-foreground p-6 text-center border border-dashed border-border rounded-2xl">
              Loading upcoming sessions...
            </div>
          )}
          {bookings
            .filter((b) => b.status === "upcoming" || b.status === "pending")
            .sort((a, b) => localBookingDate(a).localeCompare(localBookingDate(b)) || localBookingTime(a).localeCompare(localBookingTime(b)))
            .map((b) => (
              <button
                key={b.id}
                onClick={() => setEditing(b)}
                className="text-left rounded-2xl border border-border bg-card p-3 hover:bg-muted/40 transition"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="size-8"><AvatarImage src={b.with.avatar} /><AvatarFallback>{b.with.name.slice(0, 2)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{b.with.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{b.with.title}</div>
                  </div>
                </div>
                <div className="text-sm truncate">{b.topic}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1"><CalendarIcon className="size-3" />{localBookingDate(b)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" />{localBookingTime(b)}</span>
                </div>
                <Badge className={`mt-2 border ${statusTone[b.status]} capitalize`} variant="outline">{b.status}</Badge>
              </button>
            ))}
          {!isLoading && bookings.filter((b) => b.status === "upcoming" || b.status === "pending").length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground p-6 text-center border border-dashed border-border rounded-2xl">
              No active sessions. Book one from a profile or the finder.
            </div>
          )}
        </div>
      </Card>

      <BookingEditor
        booking={editing}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          const token = getAuthToken();
          if (!token) return;
          try {
            const saved = await apiRequest<Booking>(`/bookings/${editing.id}`, {
              method: "PATCH",
              token,
              body: patch,
            });
            updateBooking(editing.id, saved);
            toast.success("Session updated");
            setEditing(null);
          } catch (err: any) {
            toast.error("Failed to update session", { description: err.message });
          }
        }}
        onCancel={async () => {
          if (!editing) return;
          const token = getAuthToken();
          if (!token) return;
          try {
            await apiRequest(`/bookings/${editing.id}`, { method: "DELETE", token });
            updateBooking(editing.id, { status: "cancelled" });
            toast("Session cancelled");
            setEditing(null);
          } catch (err: any) {
            toast.error("Failed to cancel session", { description: err.message });
          }
        }}
      />
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function BookingEditor({
  booking, onClose, onSave, onCancel,
}: {
  booking: Booking | null;
  onClose: () => void;
  onSave: (patch: Partial<Booking>) => Promise<void>;
  onCancel: () => Promise<void>;
}) {
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (booking) { setDate(localBookingDate(booking)); setTime(localBookingTime(booking)); setTopic(booking.topic); }
  }, [booking]);

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle>Edit session</DialogTitle>
              <DialogDescription>With {booking.with.name} · {booking.duration}m</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {booking.meetingLink && (
                  <a href={booking.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-sm hover:bg-muted">
                    <Video className="size-4" /> Join <ExternalLink className="size-3" />
                  </a>
                )}
                <Button
                  variant="outline"
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await onSave({ status: "upcoming" });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  <Check className="size-4" /> Confirm
                </Button>
                <Button
                  variant="outline"
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await onSave({
                        date,
                        time,
                        topic,
                        startsAt: new Date(`${date}T${time}`).toISOString(),
                      });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  <RefreshCw className="size-4" /> Reschedule
                </Button>
                <Button
                  variant="outline"
                  disabled={isSaving}
                  className="text-[var(--rose)] border-[var(--rose)]/40 hover:bg-[var(--rose)]/10"
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await onCancel();
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  <Trash2 className="size-4" /> Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
