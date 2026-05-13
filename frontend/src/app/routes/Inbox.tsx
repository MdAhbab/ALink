import * as React from "react";
import { motion } from "motion/react";
import { apiRequest, getAuthToken } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";

export default function Inbox() {
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [people, setPeople] = React.useState<any[]>([]);

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    Promise.all([
      apiRequest<any[]>("/notifications", { token }).then(setNotifications).catch(() => {}),
      apiRequest<any[]>("/users", { token }).then(setPeople).catch(() => {}),
    ]);
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
              {notifications.map(n => (
                <motion.div key={n.id} whileHover={{ x: 2 }} className="p-4 hover:bg-muted/40 cursor-pointer">
                  <div className="flex items-start gap-2">
                    {n.unread && <span className="mt-1.5 size-1.5 rounded-full bg-[var(--brand-500)]" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{n.body}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{n.at} ago</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <strong className="text-sm">Conversations</strong>
              <Badge variant="secondary">{people.length - 2}</Badge>
            </div>
            <div className="divide-y divide-border">
              {people.slice(0, 5).map(p => (
                <div key={p.id} className="p-4 flex items-center gap-3 hover:bg-muted/40 cursor-pointer">
                  <Avatar className="size-10"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">Excited to chat — would Friday work for you?</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">2h</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
