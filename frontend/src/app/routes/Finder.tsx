import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/auth";
import { apiRequest, apiRequestAll, getAuthToken } from "../lib/api";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { PersonCard } from "../components/people/PersonCard";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Search, SlidersHorizontal, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "./Auth";
import { useNavigate } from "react-router";
import { openDirectThread } from "../lib/chat";

export default function Finder() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const [role, setRole] = React.useState<Role | "all">(user?.role === "alumni" ? "student" : "alumni");
  const [industry, setIndustry] = React.useState<string | null>(null);
  const [university, setUniversity] = React.useState<string | null>(null);
  const [people, setPeople] = React.useState<any[]>([]);
  const [topMatches, setTopMatches] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const controller = new AbortController();
    setIsLoading(true);
    apiRequestAll<any>("/users", { token, signal: controller.signal })
      .then(setPeople)
      .catch((err: any) => {
        if (err?.name !== "AbortError") {
          toast.error("Failed to fetch users", { description: err.message });
        }
      })
      .finally(() => setIsLoading(false));
    // Fetch recommendations separately; failures are silently ignored
    apiRequest<any[]>("/recommendations/people?limit=8", { token, signal: controller.signal })
      .then(setTopMatches)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const industries = Array.from(new Set(people.map(p => p.industry).filter(Boolean) as string[]));
  const universities = Array.from(new Set(people.map(p => p.university).filter(Boolean) as string[]));

  const filtered = people.filter(p =>
    (role === "all" || p.role === role) &&
    (!industry || p.industry === industry) &&
    (!university || p.university === university) &&
    [p.name, p.title, p.company, p.major].filter(Boolean).join(" ").toLowerCase().includes(debouncedQ.toLowerCase())
  );

  const smartHints = React.useMemo(() => {
    const query = debouncedQ.trim().toLowerCase();
    const hints = [] as string[];
    if (!query) {
      hints.push("Start with a major, industry, or company to surface the best alumni matches.");
    } else {
      if (query.includes("ai") || query.includes("ml")) hints.push("AI and data roles are often the strongest signal for this query.");
      if (query.includes("mentor") || query.includes("mentorship")) hints.push("Mentor-ready profiles usually show open-to-mentor or leadership experience.");
      if (query.includes("job") || query.includes("intern")) hints.push("Job and internship keywords help surface people with recent hiring context.");
      hints.push(`We matched ${filtered.length} result${filtered.length === 1 ? "" : "s"} using your current search intent.`);
    }
    return hints.slice(0, 3);
  }, [debouncedQ, filtered.length]);

  const messagePerson = async (p: any) => {
    try {
      const thread = await openDirectThread(p.id);
      toast.success(`Conversation opened with ${p.name}`);
      nav(`/app/inbox?thread=${encodeURIComponent(thread.id)}`);
    } catch (err: any) {
      toast.error("Failed to open message", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6">
        <h1 className="font-serif text-4xl">Find your next intro.</h1>
        <p className="text-muted-foreground">Discover {role === "alumni" ? "alumni" : role === "student" ? "students" : "people"} by role, major, university, industry, or company.</p>

        <div className="mt-5 grid md:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, company, major…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(["all","student","alumni"] as const).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`h-11 px-3.5 rounded-xl border text-sm capitalize transition ${role === r ? "border-[var(--brand-500)] bg-[color:var(--brand-50)] dark:bg-[color:var(--brand-900)]/40" : "border-border hover:bg-muted"}`}>
                {r === "all" ? "All roles" : r}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <FilterChip label="Industry" value={industry} onClear={() => setIndustry(null)} />
          <div className="flex flex-wrap gap-1.5">
            {industries.map(i => (
              <button key={i} onClick={() => setIndustry(industry === i ? null : i)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${industry === i ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <FilterChip label="University" value={university} onClear={() => setUniversity(null)} />
          <div className="flex flex-wrap gap-1.5">
            {universities.map(u => (
              <button key={u} onClick={() => setUniversity(university === u ? null : u)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${university === u ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[color:var(--brand-50)] dark:bg-[color:var(--brand-900)]/30 p-2 text-[var(--brand-600)] dark:text-[var(--brand-300)]"><Sparkles className="size-4" /></div>
          <div>
            <div className="text-sm font-medium">Smart Search AI</div>
            <p className="text-xs text-muted-foreground">AI-style hints are generated from your current filters and query to help you narrow the right people faster.</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {smartHints.map((hint) => <li key={hint} className="flex items-start gap-2"><span className="mt-1 size-1.5 rounded-full bg-[var(--brand-500)]" />{hint}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {topMatches.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">Top matches for you</span>
            <Badge variant="secondary" className="rounded-full text-[10px]">{topMatches.length}</Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {topMatches.map(p => (
              <div key={p.id} className="shrink-0 w-32 rounded-xl border border-border bg-background p-3 text-center hover:bg-muted/50 transition cursor-pointer"
                onClick={() => nav(`/app/finder`)}>
                <div className="size-10 rounded-full bg-muted mx-auto overflow-hidden">
                  {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-sm">{p.name?.[0]}</div>}
                </div>
                <div className="text-xs mt-2 truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{p.title}</div>
                <Badge variant="secondary" className="mt-1.5 text-[9px] h-4 px-1.5 rounded-full">{Math.round(p.matchScore * 100)}% match</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`}
        </div>
        <div className="text-xs text-muted-foreground">Sorted by relevance</div>
      </div>

      <AnimatePresence>
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading && (
            <div className="col-span-full text-center text-muted-foreground py-16 rounded-2xl border border-dashed border-border">
              Loading people...
            </div>
          )}
          {filtered.map(p => (
            <PersonCard key={p.id} p={p}
              onConnect={async (p) => {
                try {
                  await apiRequest("/connections/requests", {
                    method: "POST",
                    token: getAuthToken() || undefined,
                    body: { to_id: p.id, message: "Hi! I'd like to connect." },
                  });
                  toast.success(`Request sent to ${p.name}`);
                } catch (err: any) {
                  toast.error("Failed to connect", { description: err.message });
                }
              }}
              onMessage={messagePerson}
              onBook={(p) => nav(`/app/bookings?new=1&withId=${encodeURIComponent(p.id)}`)}
              onRefer={(p) => nav(`/app/referrals?new=1&referrerId=${encodeURIComponent(p.id)}`)}
            />
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-16 rounded-2xl border border-dashed border-border">
              <div className="font-serif text-2xl">No matches</div>
              <p className="text-sm">Try broadening your filters or removing a tag.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ label, value, onClear }: { label: string; value: string | null; onClear: () => void }) {
  return (
    <Badge variant="outline" className="rounded-full gap-1.5 px-2.5 py-1">
      {label}: <span className="text-foreground">{value ?? "any"}</span>
      {value && <button onClick={onClear} aria-label="clear" className="hover:text-foreground"><X className="size-3" /></button>}
    </Badge>
  );
}
