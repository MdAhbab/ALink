import * as React from "react";
import { motion } from "motion/react";
import { apiRequest, getAuthToken } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Card, CardContent } from "../components/ui/card";
import { Trophy, Flame, Target } from "lucide-react";

const rarityColor: Record<string, string> = {
  Common: "var(--mint)",
  Rare: "var(--brand-500)",
  Epic: "var(--rose)",
  Legendary: "var(--amber)",
};

export default function Achievements() {
  const [achievements, setAchievements] = React.useState<any[]>([]);

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    apiRequest<any[]>("/achievements", { token }).then(setAchievements).catch(() => {});
  }, []);

  const earned = achievements.filter(a => a.earnedAt).length;
  const total = achievements.length || 1;
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border p-6 md:p-8 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1C1142, #6743EE 55%, #F5B461)" }}>
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(255,255,255,0.25),transparent)]" />
        <div className="relative grid md:grid-cols-3 gap-5 items-center">
          <div className="md:col-span-2">
            <Badge className="rounded-full bg-white/15 text-white border-white/20"><Trophy className="size-3" /> Level 7 · Networker</Badge>
            <h1 className="font-serif text-4xl md:text-5xl mt-3">Your ALink journey</h1>
            <p className="text-white/85 mt-2">Earn badges by connecting, mentoring, and giving back. {earned} of {total} unlocked.</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/85"><span>XP to Level 8</span><span>1,240 / 1,500</span></div>
              <Progress value={82} className="h-2 mt-1.5 bg-white/15" />
            </div>
          </div>
          <div className="flex justify-center gap-2 text-center">
            <Stat icon={Flame} label="Streak" value="7d" />
            <Stat icon={Target} label="Goals" value="3" />
            <Stat icon={Trophy} label="Badges" value={`${earned}`} />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((a, i) => {
          const tone = rarityColor[a.rarity];
          const earned = !!a.earnedAt;
          return (
            <motion.div key={a.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileHover={{ y: -3, rotate: -1 }}
            >
              <Card className={`relative overflow-hidden ${earned ? "" : "opacity-60"}`}>
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <motion.div animate={earned ? { rotate: [0, 6, -6, 0] } : {}} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                      className="size-14 rounded-2xl grid place-items-center text-3xl" style={{ background: `${tone}22` }}>
                      {a.emoji}
                    </motion.div>
                    <Badge variant="outline" className="rounded-full" style={{ borderColor: tone, color: tone }}>{a.rarity}</Badge>
                  </div>
                  <div className="font-serif text-xl mt-3">{a.title}</div>
                  <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                  <div className="text-xs text-muted-foreground mt-3">
                    {earned ? `Earned · ${a.earnedAt}` : "Locked"}
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

function Stat({ icon: I, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 p-3 min-w-20">
      <I className="size-4 mx-auto text-white" />
      <div className="font-serif text-2xl mt-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/75">{label}</div>
    </div>
  );
}
