import * as React from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../lib/auth";
import { apiRequest, getAuthToken } from "../lib/api";
import { openGroupThread } from "../lib/chat";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Calendar, Users, Clock, MessageCircle, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function MentorshipApplicants() {
  const { user } = useAuth();
  const { programId } = useParams();
  const nav = useNavigate();
  const [program, setProgram] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    const token = getAuthToken();
    if (!token || !programId) return;

    setIsLoading(true);
    apiRequest<any>(`/mentorship/programs/${programId}`, { token, signal: controller.signal })
      .then((program) => {
        setProgram(program);
      })
      .catch(() => {
        toast.error("Failed to load program details");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [programId, user?.id]);

  const openGroupMessage = async () => {
    if (!program) return;
    const ids = program.applications
      .map((app: any) => app.applicant?.id)
      .filter((id: string | undefined): id is string => Boolean(id));
    if (!ids.length) {
      toast.error("No applicants to message yet.");
      return;
    }

    try {
      const thread = await openGroupThread(ids, `Applicants for ${program.title}`, programId);
      toast.success("Opened group conversation with applicants");
      nav(`/app/inbox?thread=${encodeURIComponent(thread.id)}`);
    } catch (err: any) {
      toast.error("Failed to open message group", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="size-8 rounded-full border-2 border-muted border-t-[var(--brand-500)] animate-spin" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <div className="text-xl font-semibold">Program not found</div>
        <p className="mt-2 text-sm text-muted-foreground">Check that you have access to this mentorship program.</p>
        <Button className="mt-6" onClick={() => nav("/app/mentorship")}>Back to mentorship</Button>
      </div>
    );
  }

  const isCreator = user?.id === program.mentor?.id;

  if (!isCreator) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <div className="text-xl font-semibold">Access denied</div>
        <p className="mt-2 text-sm text-muted-foreground">Only the creator of this mentorship program can view applicants.</p>
        <Button className="mt-6" onClick={() => nav("/app/mentorship")}>Back to mentorship</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => nav("/app/mentorship")}> 
          <ChevronLeft className="size-4" /> Back
        </Button>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Applicants</div>
          <h1 className="font-serif text-3xl mt-2">{program.title}</h1>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] items-center">
          <div>
            <div className="flex items-center gap-3">
              <Avatar className="size-12"><AvatarImage src={program.mentor?.avatar} /><AvatarFallback>{program.mentor?.name?.[0]}</AvatarFallback></Avatar>
              <div>
                <div className="text-sm font-semibold">{program.mentor?.name}</div>
                <div className="text-xs text-muted-foreground">{program.mentor?.title}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">{program.focus?.join(" · ")}</div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Badge variant={program.price === "Free" ? "secondary" : "default"}>{program.price}</Badge>
            <Badge className="rounded-full" variant="outline">{program.filled}/{program.spots} enrolled</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Start date</div>
            <div className="text-base font-medium mt-1">{program.startDate || "TBD"}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-muted/60 p-3"><Clock className="size-3 inline mr-1 text-muted-foreground" /> {program.duration}</div>
              <div className="rounded-lg bg-muted/60 p-3"><Calendar className="size-3 inline mr-1 text-muted-foreground" /> {program.cadence}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Applicants</div>
            <div className="text-3xl font-semibold mt-2">{program.applications.length}</div>
            <div className="mt-4 text-sm text-muted-foreground">Only you can see the enrolled participants and message them as a group.</div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border border-border/70 bg-muted/80 shadow-sm">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
          <div>
            <div className="text-sm font-semibold">Applicants overview</div>
            <div className="text-xs text-muted-foreground">View the full applicant list and message the cohort together.</div>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            <Button type="button" size="sm" variant="outline" className="min-w-[10rem]" onClick={() => nav("/app/mentorship")}>Back to programs</Button>
            <Button type="button" size="sm" className="min-w-[10rem]" onClick={openGroupMessage} disabled={program.applications.length === 0}>
              Message applicants
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {program.applications.length ? (
          program.applications.map((app: any) => (
            <Card key={app.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12"><AvatarImage src={app.applicant.avatar} /><AvatarFallback>{app.applicant.name?.[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{app.applicant.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{app.applicant.title || app.applicant.university}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Applied {new Date(app.createdAt).toLocaleDateString()}</div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            No applicants have joined this program yet.
          </div>
        )}
      </div>
    </div>
  );
}
