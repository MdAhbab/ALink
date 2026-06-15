import * as React from "react";
import { motion } from "motion/react";
import { apiRequest, getAuthToken } from "../lib/api";
import { timeAgo } from "../lib/time";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { useSearchParams } from "react-router";

export default function Inbox() {
  const [params] = useSearchParams();
  const selectedThreadId = params.get("thread");
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [threads, setThreads] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    const token = getAuthToken();
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      apiRequest<any[]>("/notifications", { token, signal: controller.signal }).then(setNotifications).catch(() => {}),
      apiRequest<any[]>("/chat/threads", { token, signal: controller.signal }).then(setThreads).catch(() => {}),
    ])
      .catch((err: any) => {
        if (err?.name !== "AbortError") {
          toast.error("Failed to load inbox", { description: err.message });
        }
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">Inbox</h1>
        <p className="text-muted-foreground">All your updates in one calm place.</p>
      </div>
      <div className="grid lg:grid-cols-[1fr_2fr] gap-5">
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border"><strong className="text-sm">Notifications</strong></div>
            <div className="divide-y divide-border max-h-[600px] overflow-auto">
              {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading notifications...</div>}
              {notifications.map(n => (
                <motion.div key={n.id} whileHover={{ x: 2 }} className="p-4 hover:bg-muted/40 cursor-pointer">
                  <div className="flex items-start gap-2">
                    {n.unread && <span className="mt-1.5 size-1.5 rounded-full bg-[var(--brand-500)]" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{n.body}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.at)}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {!isLoading && notifications.length === 0 && <div className="p-4 text-sm text-muted-foreground">No notifications yet.</div>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <strong className="text-sm">Conversations</strong>
              <Badge variant="secondary">{threads.reduce((n, t) => n + (t.unreadCount || 0), 0)} unread</Badge>
            </div>
            <div className="divide-y divide-border">
              {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading conversations...</div>}
              {threads.map(t => (
                <div
                  key={t.id}
                  className={`p-4 flex items-center gap-3 hover:bg-muted/40 cursor-pointer ${
                    selectedThreadId === t.id ? "bg-[color:var(--brand-50)] dark:bg-[color:var(--brand-900)]/30" : ""
                  }`}
                >
                  <Avatar className="size-10"><AvatarImage src={t.members?.[0]?.avatar} /><AvatarFallback>{t.title?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.lastMessage?.body || "No messages yet"}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] text-muted-foreground">{t.lastMessage?.at ? timeAgo(t.lastMessage.at) : ""}</div>
                    {t.unreadCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{t.unreadCount}</Badge>}
                  </div>
                </div>
              ))}
              {!isLoading && threads.length === 0 && <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
