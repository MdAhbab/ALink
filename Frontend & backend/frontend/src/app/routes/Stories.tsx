import * as React from "react";
import { motion } from "motion/react";
import { useAuth } from "../lib/auth";
import { apiRequest, getAuthToken } from "../lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { BookOpen, Clock, Quote, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Stories() {
  const { user } = useAuth();
  const [stories, setStories] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);

  const fetchStories = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<any[]>("/stories", { token });
      setStories(data);
    } catch (err: any) {
      toast.error("Failed to load stories", { description: err.message });
    }
  }, []);

  React.useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div aria-hidden className="absolute -top-12 -right-12 size-60 rounded-full brand-gradient opacity-20 blur-3xl" />
        <div className="relative z-10">
          <Badge variant="secondary" className="rounded-full"><BookOpen className="size-3" /> Alumni playbooks</Badge>
          <h1 className="font-serif text-4xl md:text-5xl mt-3">Stories &amp; reflections</h1>
          <p className="text-muted-foreground">Career journeys, what worked, what didn't — written by the alumni who lived them.</p>
        </div>
        {(user?.role === "admin" || user?.role === "alumni") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 relative z-10"><Plus className="size-4" /> Share story</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Share your story</DialogTitle></DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await apiRequest("/stories", {
                    method: "POST",
                    token: getAuthToken() || undefined,
                    body: {
                      title: fd.get("title"),
                      tag: fd.get("tag"),
                      excerpt: fd.get("excerpt"),
                      cover: "#F5B461",
                    }
                  });
                  toast.success("Story shared successfully");
                  setOpen(false);
                  fetchStories();
                } catch (err: any) {
                  toast.error("Failed to share story", { description: err.message });
                }
              }} className="space-y-4 mt-4">
                <div className="space-y-1.5"><Label>Title</Label><Input name="title" required /></div>
                <div className="space-y-1.5"><Label>Category Tag</Label><Input name="tag" placeholder="e.g. Interview Prep" required /></div>
                <div className="space-y-1.5"><Label>Excerpt / Content</Label><Textarea name="excerpt" rows={5} required /></div>
                <Button type="submit" className="w-full">Publish</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Featured */}
      {stories.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-5">
          <FeaturedStory s={stories[0]} />
          <FeaturedStory s={stories[1]} />
        </motion.div>
      )}

      {/* List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.slice(2).length > 0 ? stories.slice(2).map((s, i) => (
          <motion.div key={s.id} whileHover={{ y: -3 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="overflow-hidden h-full">
              <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${s.cover}, ${s.cover}55)` }}>
                <Quote className="absolute bottom-3 right-3 size-6 text-white/70" />
              </div>
              <CardContent className="p-5">
                <Badge variant="outline" className="rounded-full">{s.tag}</Badge>
                <div className="font-serif text-xl mt-2">{s.title}</div>
                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{s.excerpt}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Avatar className="size-7"><AvatarImage src={s.author.avatar} /><AvatarFallback>{s.author.name[0]}</AvatarFallback></Avatar>
                  <div className="text-xs">{s.author.name}</div>
                  <div className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="size-3" /> {s.readMinutes}m</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )) : (stories.length === 0 && <div className="col-span-full py-16 text-center text-muted-foreground">No stories published yet.</div>)}
      </div>
    </div>
  );
}

function FeaturedStory({ s }: { s: any }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="rounded-3xl border border-border overflow-hidden relative">
      <div className="h-44 relative" style={{ background: `linear-gradient(135deg, ${s.cover}, ${s.cover}40)` }}>
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_30%,rgba(255,255,255,0.35),transparent)]" />
      </div>
      <div className="p-6 bg-card">
        <Badge variant="outline" className="rounded-full">{s.tag} · Featured</Badge>
        <div className="font-serif text-2xl mt-2">{s.title}</div>
        <p className="text-sm text-muted-foreground mt-1.5">{s.excerpt}</p>
        <div className="mt-4 flex items-center gap-2">
          <Avatar className="size-8"><AvatarImage src={s.author.avatar} /><AvatarFallback>{s.author.name[0]}</AvatarFallback></Avatar>
          <div className="text-sm">{s.author.name}</div>
          <div className="ml-auto text-xs text-muted-foreground">{s.readMinutes}m read</div>
        </div>
      </div>
    </motion.div>
  );
}
