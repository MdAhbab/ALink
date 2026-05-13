import * as React from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { apiRequest, getAuthToken } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { PersonCard } from "../components/people/PersonCard";
import { toast } from "sonner";
import { Check, Search, X } from "lucide-react";

export default function Connections() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "directory";
  const [q, setQ] = React.useState("");
  const [people, setPeople] = React.useState<any[]>([]);
  const [connected, setConnected] = React.useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = React.useState<any[]>([]);

  const fetchConnections = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const [u, c, r] = await Promise.all([
        apiRequest<any[]>("/users", { token }),
        apiRequest<any[]>("/connections", { token }),
        apiRequest<any[]>("/connections/requests", { token })
      ]);
      setPeople(u);
      setConnected(c);
      setIncomingRequests(r);
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const connectedIds = new Set(connected.map(c => c.id));

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
              {list.map(p => (
                <PersonCard key={p.id} p={{ ...p, connected: connectedIds.has(p.id) }}
                  onConnect={async (p) => {
                    try {
                      await apiRequest("/connections/requests", {
                        method: "POST",
                        token: getAuthToken() || undefined,
                        body: { to_id: p.id, message: "Hi! I'd like to connect." }
                      });
                      toast.success(`Request sent to ${p.name}`);
                      fetchConnections();
                    } catch (err: any) {
                      toast.error("Failed to connect", { description: err.message });
                    }
                  }}
                  onBook={(p) => toast(`Open booking with ${p.name}`)}
                  onRefer={(p) => toast(`Request a referral from ${p.name}`)}
                />
              ))}
              {list.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-16">No matches. Try a different filter.</div>
              )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="connected">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connected.map(p => (
              <PersonCard key={p.id} p={{ ...p, connected: true }} onMessage={(p) => toast(`Message ${p.name}`)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-3">
            {incomingRequests.map(r => (
              <motion.div layout key={r.id} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                <Avatar className="size-12"><AvatarImage src={r.from.avatar} /><AvatarFallback>{r.from.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{r.from.name} <span className="text-muted-foreground">· {r.from.title}{r.from.company ? `, ${r.from.company}` : ""}</span></div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.message}</p>
                  <div className="text-[10px] text-muted-foreground mt-1">{r.at}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => toast(`Declined ${r.from.name}`)}><X className="size-4" /></Button>
                  <Button size="sm" onClick={() => toast.success(`You're connected with ${r.from.name}`)}><Check className="size-4" /></Button>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
