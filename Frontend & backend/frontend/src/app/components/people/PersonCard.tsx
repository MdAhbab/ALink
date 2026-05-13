import { motion } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CheckCircle2, MessageCircle, UserPlus, Calendar, Briefcase } from "lucide-react";

export type Person = any;

export function PersonCard({ p, onConnect, onMessage, onBook, onRefer }: {
  p: Person;
  onConnect?: (p: Person) => void;
  onMessage?: (p: Person) => void;
  onBook?: (p: Person) => void;
  onRefer?: (p: Person) => void;
}) {
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="group rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-12">
          <AvatarImage src={p.avatar} />
          <AvatarFallback>{p.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm truncate">{p.name}</h3>
            {p.verified && <CheckCircle2 className="size-3.5 text-[var(--brand-600)]" />}
          </div>
          <div className="text-xs text-muted-foreground truncate">{p.title}{p.company ? ` · ${p.company}` : ""}</div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">{p.university} · {p.major}</div>
        </div>
        <Badge variant="outline" className="rounded-full capitalize">{p.role}</Badge>
      </div>

      <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {p.skills.slice(0, 3).map((s: string) => <Badge key={s} variant="secondary" className="rounded-full text-[10px]">{s}</Badge>)}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {p.connected ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onMessage?.(p)}><MessageCircle className="size-3.5" /> Message</Button>
        ) : (
          <Button size="sm" className="gap-1.5" onClick={() => onConnect?.(p)}><UserPlus className="size-3.5" /> Connect</Button>
        )}
        {p.role === "alumni" && p.open && (
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onBook?.(p)}><Calendar className="size-3.5" /> Book</Button>
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => onRefer?.(p)}><Briefcase className="size-3.5" /> Refer</Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
