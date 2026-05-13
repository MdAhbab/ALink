import * as React from "react";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { apiRequest, getAuthToken } from "../lib/api";
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
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = React.useState(params.get("new") === "1");
  const [referrals, setReferrals] = React.useState<any[]>([]);

  const fetchReferrals = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<any[]>("/referrals", { token });
      setReferrals(data);
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Referrals</h1>
          <p className="text-muted-foreground">Request warm intros. Track every step.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setParams({}); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" /> New referral</Button></DialogTrigger>
          <NewReferral onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
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
                    <Button variant="ghost" size="sm" className="gap-1.5"><FileText className="size-3.5" /> Resume <ExternalLink className="size-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function NewReferral({ onClose }: { onClose: () => void }) {
  const submit = () => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.3 }, colors: ["#7C5CFF", "#F5B461", "#5DE0B0"] });
    toast.success("Referral submitted", { description: "We'll notify your referrer." });
    onClose();
  };
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">Request a referral</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Company</Label><Input placeholder="Stripe" /></div>
          <div className="space-y-1.5"><Label>Role</Label><Input placeholder="SWE Intern" /></div>
        </div>
        <div className="space-y-1.5"><Label>Pitch</Label><Textarea rows={4} placeholder="Why are you a fit? Keep it concise — 3 sentences." /></div>
        <div className="space-y-1.5"><Label>Resume link</Label><Input placeholder="https://..." /></div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} className="gap-2"><CheckCircle2 className="size-4" /> Submit</Button>
      </DialogFooter>
    </DialogContent>
  );
}
