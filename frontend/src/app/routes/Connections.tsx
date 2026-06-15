import * as React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/auth";
import { apiRequest, apiRequestAll, getAuthToken } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { PersonCard } from "../components/people/PersonCard";
import { toast } from "sonner";
import { Check, Search, X } from "lucide-react";
import { openDirectThread } from "../lib/chat";

export default function Connections() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "directory";
  const [q, setQ] = React.useState("");
  const [people, setPeople] = React.useState<any[]>([]);
  const [connected, setConnected] = React.useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = React.useState<any[]>([]);
  const [sentRequests, setSentRequests] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchConnections = React.useCallback(async (signal?: AbortSignal) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const [u, c, r, s] = await Promise.all([
        apiRequestAll<any>("/users", { token, signal }),
        apiRequest<any[]>("/connections", { token, signal }),
        apiRequest<any[]>("/connections/requests", { token, signal }),
        apiRequest<any[]>("/connections/requests/sent", { token, signal }),
      ]);
      setPeople(u.filter((p) => p.id !== user?.id));
      setConnected(c);
      setIncomingRequests(r);
      setSentRequests(s);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Failed to load connections", { description: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetchConnections(controller.signal);
    return () => controller.abort();
  }, [fetchConnections]);

  const connectedIds = new Set(connected.map(c => c.id));
  // sentRequests each have toId (aliased from to_id in the backend schema)
  const pendingIds = new Set<string>(
    sentRequests.map((r: any) => r.toId).filter(Boolean)
  );
  const messagePerson = async (p: any) => {
    try {
      const thread = await openDirectThread(p.id);
      toast.success(`Conversation opened with ${p.name}`);
      nav(`/app/inbox?thread=${encodeURIComponent(thread.id)}`);
    } catch (err: any) {
      toast.error("Failed to open message", { description: err.message });
    }
  };

  const list = people.filter(p =>
    [p.name, p.title, p.company, p.university, p.major, p.industry].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">Connections</h1>
        <p className="text-muted-foreground">Discover people. Manage requests. Grow your network with intent.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <TabsList>
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="connected">Connected <Badge variant="secondary" className="ml-1.5">{connected.length}</Badge></TabsTrigger>
            <TabsTrigger value="requests">Requests <Badge variant="secondary" className="ml-1.5">{incomingRequests.length}</Badge></TabsTrigger>
          </TabsList>
          <div className="md:ml-auto relative w-full md:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search directory…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <TabsContent value="directory">
          <AnimatePresence>
            <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading && (
                <div className="col-span-full text-center text-muted-foreground py-16">Loading directory...</div>
              )}
              {list.map(p => (
                <PersonCard
                  key={p.id}
                  p={{ ...p, connected: connectedIds.has(p.id), pending: pendingIds.has(p.id) }}
                  onConnect={async (p) => {
                    try {
                      await apiRequest("/connections/requests", {
                        method: "POST",
                        token: getAuthToken() || undefined,
                        body: { toId: p.id, message: "" }
                      });
                      toast.success(`Request sent to ${p.name}`);
                      fetchConnections();
                    } catch (err: any) {
                      toast.error("Failed to connect", { description: err.message });
                    }
                  }}
                  onBook={(p) => nav(`/app/bookings?new=1&withId=${encodeURIComponent(p.id)}`)}
                  onRefer={(p) => nav(`/app/referrals?new=1&referrerId=${encodeURIComponent(p.id)}`)}
                  onMessage={messagePerson}
                />
              ))}
              {!isLoading && list.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-16">No matches. Try a different filter.</div>
              )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="connected">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connected.map(p => (
              <PersonCard key={p.id} p={{ ...p, connected: true }} onMessage={messagePerson} />
            ))}
            {!isLoading && connected.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-16">No connections yet. Browse the directory to connect!</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-3">
            {isLoading && <div className="text-center text-muted-foreground py-8">Loading requests...</div>}
            {incomingRequests.map(r => (
              <motion.div layout key={r.id} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                <Avatar className="size-12"><AvatarImage src={r.from?.avatar} /><AvatarFallback>{r.from?.name?.[0] ?? "?"}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{r.from?.name} <span className="text-muted-foreground">· {r.from?.title}{r.from?.company ? `, ${r.from.company}` : ""}</span></div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.message}</p>
                  <div className="text-[10px] text-muted-foreground mt-1">{r.at}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await apiRequest(`/connections/requests/${r.id}/decline`, { method: "POST", token: getAuthToken() || undefined });
                        toast(`Declined ${r.from?.name}`);
                        fetchConnections();
                      } catch (err: any) {
                        toast.error("Failed to decline request", { description: err.message });
                      }
                    }}
                  ><X className="size-4" /></Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await apiRequest(`/connections/requests/${r.id}/accept`, { method: "POST", token: getAuthToken() || undefined });
                        toast.success(`You're connected with ${r.from?.name}`);
                        fetchConnections();
                      } catch (err: any) {
                        toast.error("Failed to accept request", { description: err.message });
                      }
                    }}
                  ><Check className="size-4" /></Button>
                </div>
              </motion.div>
            ))}
            {!isLoading && incomingRequests.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No pending requests.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
