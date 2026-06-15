import * as React from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { apiRequest, apiRequestAll, getAuthToken } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Briefcase, Building2, MapPin, Search, Sparkles, Heart, Bookmark } from "lucide-react";
import { toast } from "sonner";

export default function Jobs() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const [saved, setSaved] = React.useState<Set<string>>(new Set());
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const savedStorageKey = React.useMemo(() => `alink:saved-jobs:${user?.id ?? "anon"}`, [user?.id]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(savedStorageKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(new Set(parsed));
    } catch {
      setSaved(new Set());
    }
  }, [savedStorageKey]);

  React.useEffect(() => {
    localStorage.setItem(savedStorageKey, JSON.stringify(Array.from(saved)));
  }, [saved, savedStorageKey]);

  React.useEffect(() => {
    const controller = new AbortController();
    const token = getAuthToken();
    if (!token) return;
    setIsLoading(true);
    const qParam = debouncedQ.trim() ? `&q=${encodeURIComponent(debouncedQ.trim())}` : "";
    apiRequestAll<any>(`/jobs${qParam ? `?${qParam.slice(1)}` : ""}`, { token, signal: controller.signal })
      .then(setJobs)
      .catch((err: any) => {
        if (err?.name !== "AbortError") {
          toast.error("Failed to load jobs", { description: err.message });
        }
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [debouncedQ]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 relative overflow-hidden">
        <div aria-hidden className="absolute -bottom-16 -right-10 size-60 rounded-full opacity-20 blur-3xl" style={{ background: "var(--mint)" }} />
        <Badge variant="secondary" className="rounded-full"><Sparkles className="size-3" /> Alumni-vouched roles</Badge>
        <h1 className="font-serif text-4xl md:text-5xl mt-3">Job board</h1>
        <p className="text-muted-foreground">Roles posted by alumni who can refer you — not random listings.</p>
        <div className="mt-5 relative max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-11" placeholder="Search role, company, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <AnimatePresence>
        <motion.div layout className="grid lg:grid-cols-2 gap-4">
          {isLoading && (
            <div className="lg:col-span-2 text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border">
              Loading jobs...
            </div>
          )}
          {jobs.map((j, i) => (
            <motion.div layout key={j.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <JobCard
                job={j}
                isSaved={saved.has(j.id)}
                onToggleSave={() => {
                  setSaved((current) => {
                    const next = new Set(current);
                    if (next.has(j.id)) next.delete(j.id);
                    else next.add(j.id);
                    return next;
                  });
                }}
                onRequestReferral={(job) => {
                  const url = `/app/referrals?new=1&company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.role)}${job.postedBy?.id ? `&referrerId=${encodeURIComponent(job.postedBy.id)}` : ""}`;
                  nav(url);
                }}
              />
            </motion.div>
          ))}
          {!isLoading && jobs.length === 0 && (
            <div className="lg:col-span-2 text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border">
              No jobs found.
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function JobCard({
  job: j,
  isSaved,
  onToggleSave,
  onRequestReferral,
}: {
  job: any;
  isSaved: boolean;
  onToggleSave: () => void;
  onRequestReferral: (job: any) => void;
}) {
  // Engagement counts are folded into the /jobs list payload, so no per-card
  // GET /jobs/{id}/engagement round-trip is needed on mount.
  const [likes, setLikes] = React.useState<number>(j.likesCount ?? 0);
  const [commentsCount, setCommentsCount] = React.useState<number>(j.commentsCount ?? 0);
  const [likedByMe, setLikedByMe] = React.useState<boolean>(j.likedByMe ?? false);
  const [comments, setComments] = React.useState<any[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [newComment, setNewComment] = React.useState("");

  const toggleLike = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      if (likedByMe) {
        await apiRequest(`/jobs/${j.id}/like`, { method: "DELETE", token });
        setLikes(l => l - 1);
        setLikedByMe(false);
      } else {
        await apiRequest(`/jobs/${j.id}/like`, { method: "POST", token });
        setLikes(l => l + 1);
        setLikedByMe(true);
      }
    } catch {}
  };

  const loadComments = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<any[]>(`/jobs/${j.id}/comments`, { token });
      setComments(data);
    } catch {}
  };

  const toggleComments = () => {
    if (!expanded) {
      loadComments();
    }
    setExpanded(!expanded);
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      await apiRequest(`/jobs/${j.id}/comments`, {
        method: "POST", token, body: { body: newComment.trim() }
      });
      setNewComment("");
      setCommentsCount(c => c + 1);
      loadComments();
    } catch (err: any) {
      toast.error("Failed to post comment", { description: err.message });
    }
  };

  return (
    <Card className="hover:-translate-y-0.5 transition flex flex-col h-full">
      <CardContent className="p-5 flex-1">
        <div className="flex gap-4">
          <div className="size-14 rounded-2xl grid place-items-center text-white shrink-0" style={{ background: `linear-gradient(135deg, var(--brand-500), var(--amber))` }}>
            <span className="font-mono text-sm">{j.company.slice(0,2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-serif text-xl">{j.role}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-3 mt-0.5">
                  <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" /> {j.company}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {j.location}</span>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full">{j.type}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {j.tags?.map((t: string) => <Badge key={t} variant="secondary" className="rounded-full text-[10px]">{t}</Badge>)}
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{j.salary}</span>·<span>{j.posted}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {j.postedBy && (
                  <>
                    <Avatar className="size-5"><AvatarImage src={j.postedBy.avatar} /><AvatarFallback>{j.postedBy.name?.[0]}</AvatarFallback></Avatar>
                    Posted by {j.postedBy.name}
                  </>
                )}
                <Badge variant="secondary" className="rounded-full text-[10px]">{j.alumniCount ?? 0} alumni here</Badge>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className={`gap-1.5 ${likedByMe ? "text-[var(--rose)]" : "text-muted-foreground"}`} onClick={toggleLike}>
                  <Heart className={`size-4 ${likedByMe ? "fill-[var(--rose)]" : ""}`} /> {likes}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={toggleComments}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> {commentsCount}
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={onToggleSave}>
                  <Bookmark className={`size-3.5 ${isSaved ? "fill-current" : ""}`} /> {isSaved ? "Saved" : "Save"}
                </Button>
                <Button size="sm" onClick={() => onRequestReferral(j)}><Briefcase className="size-3.5 mr-1.5" /> Request referral</Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      {expanded && (
        <div className="bg-muted/30 border-t border-border p-4 space-y-3">
          <div className="max-h-40 overflow-y-auto space-y-3 pr-2">
            {comments.map((c: any) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar className="size-6 mt-0.5"><AvatarImage src={c.author.avatar} /><AvatarFallback>{c.author.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm">
                  <div className="font-medium text-xs mb-0.5">{c.author.name}</div>
                  <p>{c.body}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <div className="text-center text-xs text-muted-foreground">No comments yet.</div>}
          </div>
          <form onSubmit={postComment} className="flex gap-2">
            <Input size={1} className="h-8 text-sm" placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} />
            <Button size="sm" type="submit" disabled={!newComment.trim()} className="h-8 px-3">Post</Button>
          </form>
        </div>
      )}
    </Card>
  );
}
