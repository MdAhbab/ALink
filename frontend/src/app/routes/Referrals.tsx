import * as React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { apiRequest, apiRequestAll, getAuthToken } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { CheckCircle2, FileText, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const stages = ["submitted", "under_review", "forwarded", "declined"] as const;
const stageLabel: Record<string, string> = {
  submitted: "Submitted", under_review: "Under review", forwarded: "Forwarded", declined: "Declined"
};

export default function Referrals() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = React.useState(params.get("new") === "1");
  const [referrals, setReferrals] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchReferrals = React.useCallback(async (signal?: AbortSignal) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequestAll<any>("/referrals", { token, signal });
      setReferrals(data);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Failed to load referrals", { description: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetchReferrals(controller.signal);
    return () => controller.abort();
  }, [fetchReferrals]);

  const initialCompany = params.get("company") ?? "";
  const initialRole = params.get("role") ?? "";
  const initialReferrerId = params.get("referrerId") ?? "";

  const updateStatus = async (id: string, status: string) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const saved = await apiRequest<any>(`/referrals/${id}`, {
        method: "PATCH",
        token,
        body: { status },
      });
      setReferrals((rows) => rows.map((r) => (r.id === id ? saved : r)));
      toast.success("Referral updated");
    } catch (err: any) {
      toast.error("Could not update referral", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Referrals</h1>
          <p className="text-muted-foreground">Request warm intros. Track every step.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setParams({}); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" /> New referral</Button></DialogTrigger>
          <NewReferral
            initialCompany={initialCompany}
            initialRole={initialRole}
            initialReferrerId={initialReferrerId}
            onClose={() => setOpen(false)}
            onCreated={() => {
              fetchReferrals();
              nav("/app/referrals", { replace: true });
            }}
          />
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {isLoading && (
          <div className="lg:col-span-2 text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border">
            Loading referrals...
          </div>
        )}
        {referrals.map(r => {
          const stageIdx = stages.indexOf(r.status);
          return (
            <motion.div layout key={r.id}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-serif text-2xl">{r.role}</div>
                      <div className="text-sm text-muted-foreground">{r.company}</div>
                    </div>
                    <Badge variant="outline" className="rounded-full">{stageLabel[r.status]}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{r.pitch}</p>

                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                      {stages.map(s => <span key={s}>{stageLabel[s]}</span>)}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {stages.map((s, i) => (
                        <div key={s} className={`h-1.5 rounded-full ${i <= stageIdx ? "brand-gradient" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {r.referrer ? (
                        <>
                          <Avatar className="size-6"><AvatarImage src={r.referrer.avatar} /><AvatarFallback>{r.referrer.name[0]}</AvatarFallback></Avatar>
                          via {r.referrer.name}
                        </>
                      ) : <>Awaiting referrer</>}
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5" asChild={!!r.resumeUrl}>
                      {r.resumeUrl ? (
                        <a href={r.resumeUrl} target="_blank" rel="noreferrer"><FileText className="size-3.5" /> Resume <ExternalLink className="size-3" /></a>
                      ) : (
                        <span><FileText className="size-3.5" /> Resume</span>
                      )}
                    </Button>
                  </div>
                  {r.owner && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Requested by {r.owner.name}
                    </div>
                  )}
                  {(user?.role === "admin" || r.referrer?.id === user?.id) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {stages.filter((s) => s !== r.status).map((s) => (
                        <Button key={s} variant="outline" size="sm" onClick={() => updateStatus(r.id, s)}>
                          {stageLabel[s]}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {!isLoading && referrals.length === 0 && (
          <div className="lg:col-span-2 text-center text-muted-foreground py-12 rounded-2xl border border-dashed border-border">
            No referrals yet.
          </div>
        )}
      </div>
    </div>
  );
}

function NewReferral({
  initialCompany,
  initialRole,
  initialReferrerId,
  onClose,
  onCreated,
}: {
  initialCompany: string;
  initialRole: string;
  initialReferrerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [company, setCompany] = React.useState(initialCompany);
  const [role, setRole] = React.useState(initialRole);
  const [pitch, setPitch] = React.useState("");
  const [resumeUrl, setResumeUrl] = React.useState("");
  const [referrerId, setReferrerId] = React.useState(initialReferrerId);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setCompany(initialCompany);
    setRole(initialRole);
    setReferrerId(initialReferrerId);
  }, [initialCompany, initialRole, initialReferrerId]);

  const submit = async () => {
    if (!company.trim() || !role.trim()) {
      toast.error("Company and role are required");
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await apiRequest("/referrals", {
        method: "POST",
        token,
        body: {
          company: company.trim(),
          role: role.trim(),
          pitch: pitch.trim(),
          resumeUrl: resumeUrl.trim(),
          referrerId: referrerId.trim() || undefined,
        },
      });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.3 }, colors: ["#7C5CFF", "#F5B461", "#5DE0B0"] });
      toast.success("Referral submitted", { description: "We'll notify your referrer." });
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error("Failed to submit referral", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">Request a referral</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Company</Label><Input placeholder="Stripe" value={company} onChange={(e) => setCompany(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Role</Label><Input placeholder="SWE Intern" value={role} onChange={(e) => setRole(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Pitch</Label><Textarea rows={4} placeholder="Why are you a fit? Keep it concise — 3 sentences." value={pitch} onChange={(e) => setPitch(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Resume link</Label><Input placeholder="https://..." value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} /></div>
        {!!referrerId && <div className="text-xs text-muted-foreground">Referrer is preselected for this request.</div>}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} disabled={submitting || !company.trim() || !role.trim()} className="gap-2"><CheckCircle2 className="size-4" /> Submit</Button>
      </DialogFooter>
    </DialogContent>
  );
}

