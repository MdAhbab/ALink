import * as React from "react";
import { motion } from "motion/react";
import { Upload, Shuffle, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { toast } from "sonner";

const DICEBEAR_STYLES = ["notionists", "avataaars", "lorelei", "thumbs", "personas", "fun-emoji"] as const;
const SEEDS = ["Sun","Atlas","River","Echo","Aspen","Nova","Lyric","Onyx","Sage","Vela","Pixel","Quill"];

function dicebear(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ede9fe,fef3c7,d1fae5,fce7f3,dbeafe`;
}

export function AvatarPicker({
  value, name, onChange,
}: { value: string; name: string; onChange: (url: string) => void }) {
  const [style, setStyle] = React.useState<string>("notionists");
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const options = React.useMemo(
    () => [...SEEDS, name].map((seed) => dicebear(style, seed)),
    [style, name],
  );

  const onUpload = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Image must be under 4MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
        toast.success("Photo uploaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const shuffle = () => {
    const s = SEEDS[Math.floor(Math.random() * SEEDS.length)] + Math.random().toString(36).slice(2, 6);
    onChange(dicebear(style, s));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="size-20 ring-2 ring-border">
          <AvatarImage src={value} />
          <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Upload photo
          </Button>
          <Button variant="outline" size="sm" onClick={shuffle}>
            <Shuffle className="size-4" /> Shuffle
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ""; }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-thin">
          {DICEBEAR_STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`relative px-2.5 h-7 rounded-full text-[11px] capitalize transition whitespace-nowrap ${
                style === s ? "text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {style === s && (
                <motion.span layoutId="avatarStylePill" className="absolute inset-0 rounded-full brand-gradient -z-0" transition={{ type: "spring", stiffness: 240, damping: 22 }} />
              )}
              <span className="relative z-10">{s.replace("-", " ")}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-44 overflow-y-auto scrollbar-thin">
          {options.map((url) => {
            const selected = url === value;
            return (
              <button
                key={url}
                onClick={() => onChange(url)}
                className={`relative rounded-xl overflow-hidden aspect-square border-2 transition ${
                  selected ? "border-[var(--brand-500)]" : "border-transparent hover:border-border"
                }`}
              >
                <img src={url} alt="avatar option" className="w-full h-full object-cover bg-muted" />
                {selected && (
                  <span className="absolute inset-0 grid place-items-center bg-black/30">
                    <Check className="size-4 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
