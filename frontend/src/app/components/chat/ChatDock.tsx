import * as React from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import {
  MessageSquare, Pin, PinOff, Search, Send, Sparkles, X, Phone, Video, ChevronLeft,
  Smile, Paperclip, Bot, Users as UsersIcon, Filter,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { aiSuggestions, openAIThread, type ChatThread, type ChatMessage } from "../../lib/chat";
import { apiRequest, apiUpload, apiUrl, getAuthToken } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { toast } from "sonner";

const spring = { type: "spring", stiffness: 260, damping: 28, mass: 0.7 } as const;
const emojiChoices = ["🙂", "😂", "😍", "👏", "🔥", "🎉", "💡", "🙏", "👍", "✨", "❤️", "🚀"];

type FilterKey = "all" | "pinned" | "ai";

export function ChatDock() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [threads, setThreads] = React.useState<ChatThread[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [query, setQuery] = React.useState("");
  
  const fetchThreads = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<ChatThread[]>("/chat/threads", { token });
      setThreads(data);
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const totalUnread = threads.reduce((n, t) => n + (t.unreadCount || 0), 0);

  const visible = React.useMemo(() => {
    let list = threads.slice().sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
    if (filter === "pinned") list = list.filter((t) => t.pinned);
    if (filter === "ai") list = list.filter((t) => t.isAI);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => 
        t.title.toLowerCase().includes(q) || 
        t.lastMessage?.body.toLowerCase().includes(q)
      );
    }
    return list;
  }, [threads, filter, query]);

  const active = activeId ? threads.find((t) => t.id === activeId) || null : null;

  const togglePin = async (id: string) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const updated = await apiRequest<ChatThread>(`/chat/threads/${id}/pin`, { method: "POST", token });
      setThreads(ts => ts.map(t => t.id === id ? updated : t));
    } catch {}
  };

  const openThread = async (id: string) => {
    setActiveId(id);
    const token = getAuthToken();
    if (!token) return;
    try {
      await apiRequest(`/chat/threads/${id}/read`, { method: "POST", token });
      setThreads(ts => ts.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
    } catch {}
  };

  const startAIChat = async () => {
    try {
      const thread = await openAIThread();
      setOpen(true);
      setThreads((items) => {
        const exists = items.some((item) => item.id === thread.id);
        return exists ? items.map((item) => item.id === thread.id ? thread : item) : [thread, ...items];
      });
      setActiveId(thread.id);
      const token = getAuthToken();
      if (token) {
        await apiRequest(`/chat/threads/${thread.id}/read`, { method: "POST", token });
      }
    } catch (err: any) {
      toast.error("Failed to open AI chat", { description: err.message });
    }
  };

  const handleCloseActive = () => {
    setActiveId(null);
    fetchThreads();
  };

  return (
    <LayoutGroup id="alink-chat-dock">
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="relative pointer-events-auto">
          <AnimatePresence initial={false} mode="popLayout">
            {!open && (
              <motion.button
                key="pill"
                layoutId="chat-shell"
                onClick={() => setOpen(true)}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={spring}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="glass rounded-full pl-2 pr-4 py-2 flex items-center gap-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] border border-white/30 dark:border-white/10"
                aria-label="Open chats"
              >
                <span className="grid place-items-center size-9 rounded-full brand-gradient text-white">
                  <MessageSquare className="size-4" />
                </span>
                <span className="text-sm pr-1">Messages</span>
                {totalUnread > 0 && (
                  <Badge className="brand-gradient text-white border-0 rounded-full px-2 h-5 min-w-5 text-[10px]">
                    {totalUnread}
                  </Badge>
                )}
              </motion.button>
            )}

            {open && (
              <motion.div
                key="panel"
                layoutId="chat-shell"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={spring}
                className="glass rounded-3xl overflow-hidden border border-white/30 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] flex flex-col"
                style={{ width: 400, height: 600, maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100vh - 88px)" }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {!active ? (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={spring}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      <DockHeader onClose={() => setOpen(false)} onOpenAI={startAIChat} />
                      <div className="px-3 py-2 border-b border-border/60">
                        <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-card/70 border border-border">
                          <Search className="size-3.5 text-muted-foreground" />
                          <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search messages…"
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {([
                            { k: "all" as const, label: "All", icon: Filter },
                            { k: "pinned" as const, label: "Pinned", icon: Pin },
                            { k: "ai" as const, label: "AI", icon: Bot },
                          ]).map((f) => (
                            <button
                              key={f.k}
                              onClick={() => setFilter(f.k)}
                              className={`relative inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] transition ${
                                filter === f.k ? "text-white" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {filter === f.k && (
                                <motion.span
                                  layoutId="chatFilterPill"
                                  className="absolute inset-0 rounded-full brand-gradient -z-0"
                                  transition={spring}
                                />
                              )}
                              <f.icon className="size-3 relative z-10" />
                              <span className="relative z-10">{f.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <LayoutGroup id="threads">
                          {visible.length === 0 ? (
                            <EmptyState />
                          ) : (
                            visible.map((t) => (
                              <ThreadRow
                                key={t.id}
                                thread={t}
                                userId={user?.id}
                                onOpen={() => openThread(t.id)}
                                onTogglePin={() => togglePin(t.id)}
                              />
                            ))
                          )}
                        </LayoutGroup>
                      </div>

                      <div className="px-3 py-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3 text-[var(--brand-500)]" /> Liquid messaging</span>
                        <span>{threads.length} conversations</span>
                      </div>
                    </motion.div>
                  ) : (
                    <ThreadView
                      key="thread"
                      thread={active}
                      userId={user?.id}
                      onBack={handleCloseActive}
                      onTogglePin={() => togglePin(active.id)}
                      onClose={() => { handleCloseActive(); setOpen(false); }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  );
}

function DockHeader({ onClose, onOpenAI }: { onClose: () => void; onOpenAI: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 h-14 border-b border-border/60">
      <span className="grid place-items-center size-8 rounded-full brand-gradient text-white">
        <MessageSquare className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm">Messages</div>
        <div className="text-[11px] text-muted-foreground">AI + people + groups</div>
      </div>
      <button
        onClick={onOpenAI}
        className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-full brand-gradient text-white text-xs"
      >
        <Bot className="size-3.5" /> AI Chat
      </button>
      <button onClick={onClose} aria-label="Close" className="size-8 grid place-items-center rounded-full hover:bg-muted">
        <X className="size-4" />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full grid place-items-center text-center p-6">
      <div>
        <div className="mx-auto size-12 rounded-2xl bg-muted grid place-items-center mb-3">
          <MessageSquare className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm">No conversations</p>
        <p className="text-xs text-muted-foreground mt-1">Try a different filter or search.</p>
      </div>
    </div>
  );
}

function ThreadRow({ thread, userId, onOpen, onTogglePin }: { thread: ChatThread; userId?: string; onOpen: () => void; onTogglePin: () => void }) {
  const otherMember = thread.members.find(m => m.id !== userId) || thread.members[0];
  
  const avatarUrl = thread.isAI ? "" : thread.isGroup ? "" : otherMember?.avatar;
  const avatarFallback = thread.title.slice(0, 2);

  const previewText = thread.lastMessage?.body || "No messages yet";
  const dateStr = thread.lastMessage?.at ? new Date(thread.lastMessage.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";

  return (
    <motion.button
      layout
      onClick={onOpen}
      whileHover={{ x: 2 }}
      transition={spring}
      className="w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-muted/40 border-b border-border/40 last:border-0"
    >
      <div className="relative shrink-0">
        {thread.isAI ? (
          <span className="grid place-items-center size-10 rounded-full brand-gradient text-white">
            <Bot className="size-4" />
          </span>
        ) : thread.isGroup ? (
          <span className="grid place-items-center size-10 rounded-full bg-[var(--peach)]/30 text-[var(--peach)]">
            <UsersIcon className="size-4" />
          </span>
        ) : (
          <Avatar className="size-10">
            <AvatarImage src={avatarUrl} alt={thread.title} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm truncate">{thread.title}</span>
          {thread.pinned && <Pin className="size-3 text-[var(--brand-500)]" />}
          <span className="ml-auto text-[10px] text-muted-foreground">{dateStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground truncate flex-1">{previewText}</p>
          {thread.unreadCount ? (
            <Badge className="brand-gradient text-white border-0 rounded-full px-1.5 min-w-5 h-5 text-[10px]">{thread.unreadCount}</Badge>
          ) : null}
        </div>
      </div>
      <span
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        className="size-7 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer"
        aria-label={thread.pinned ? "Unpin" : "Pin"}
      >
        {thread.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
      </span>
    </motion.button>
  );
}

function ThreadView({
  thread, userId, onBack, onTogglePin, onClose,
}: {
  thread: ChatThread;
  userId?: string;
  onBack: () => void;
  onTogglePin: () => void;
  onClose: () => void;
}) {
  const [text, setText] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const textRef = React.useRef<HTMLTextAreaElement | null>(null);

  const fetchMessages = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<ChatMessage[]>(`/chat/threads/${thread.id}/messages`, { token });
      setMessages(data);
    } catch {}
  }, [thread.id]);

  React.useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const submit = async (overrideText?: string) => {
    const msg = overrideText || text;
    if (!msg.trim()) return;
    setText("");

    const token = getAuthToken();
    if (!token) return;
    
    // Optimistic
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      threadId: thread.id,
      senderId: userId,
      body: msg,
      isAI: false,
      read: true,
      at: new Date().toISOString()
    }]);

    try {
      await apiRequest(`/chat/threads/${thread.id}/messages`, {
        method: "POST",
        token,
        body: { body: msg }
      });
      // Re-fetch to get confirmed message
      fetchMessages();
      // For AI threads, schedule an extra delayed refetch so the async reply shows up
      if (thread.isAI) {
        setTimeout(fetchMessages, 1200);
      }
    } catch {}
  };

  const insertEmoji = (emoji: string) => {
    const el = textRef.current;
    if (!el) {
      setText((current) => `${current}${emoji}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    setText(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + emoji.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiUpload<{ url: string; filename: string }>("/uploads/chat-image", formData, { token });
      await submit(`![${uploaded.filename}](${uploaded.url})`);
      toast.success("Image sent");
    } catch (err: any) {
      toast.error("Failed to upload image", { description: err.message });
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const otherMember = thread.members.find(m => m.id !== userId) || thread.members[0];
  const avatarUrl = thread.isAI ? "" : thread.isGroup ? "" : otherMember?.avatar;
  const openCallRoom = (mode: "call" | "video") => {
    toast.info(`${mode === "video" ? "Opening video room" : "Opening call room"} for ${thread.title}`);
    window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={spring}
      className="flex-1 flex flex-col min-h-0"
    >
      <div className="flex items-center gap-2 px-3 h-14 border-b border-border/60">
        <button onClick={onBack} className="size-8 grid place-items-center rounded-full hover:bg-muted" aria-label="Back">
          <ChevronLeft className="size-4" />
        </button>
        <div className="relative shrink-0">
          {thread.isAI ? (
            <span className="grid place-items-center size-9 rounded-full brand-gradient text-white">
              <Bot className="size-4" />
            </span>
          ) : thread.isGroup ? (
            <span className="grid place-items-center size-9 rounded-full bg-[var(--peach)]/30 text-[var(--peach)]">
              <UsersIcon className="size-4" />
            </span>
          ) : (
            <Avatar className="size-9">
              <AvatarImage src={avatarUrl} alt={thread.title} />
              <AvatarFallback>{thread.title.slice(0, 2)}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm truncate">{thread.title}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {thread.isAI ? "Your network co-pilot" : otherMember?.title || "Member"}
          </div>
        </div>
        <button onClick={onTogglePin} className="size-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground" aria-label={thread.pinned ? "Unpin" : "Pin"}>
          {thread.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </button>
        {!thread.isAI && !thread.isGroup && (
          <>
            <button
              onClick={() => openCallRoom("call")}
              className="size-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
              aria-label="Call"
            >
              <Phone className="size-4" />
            </button>
            <button
              onClick={() => openCallRoom("video")}
              className="size-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
              aria-label="Video"
            >
              <Video className="size-4" />
            </button>
          </>
        )}
        <button onClick={onClose} className="size-8 grid place-items-center rounded-full hover:bg-muted" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <Bubble key={m.id} m={m} mine={m.senderId === userId} />
          ))}
        </AnimatePresence>
        {thread.isAI && (
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Suggestions</div>
            <div className="flex flex-wrap gap-1.5">
              {aiSuggestions.map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => submit(s)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-card border border-border hover:border-[var(--brand-500)] hover:text-[var(--brand-500)]"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative border-t border-border/60 p-2 flex items-end gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => uploadImage(e.target.files?.[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="size-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground disabled:opacity-50"
          aria-label="Upload image"
          title="Upload image"
        >
          <Paperclip className="size-4" />
        </button>
        <button
          onClick={() => setEmojiOpen((open) => !open)}
          className="size-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
          aria-label="Choose emoji"
          title="Choose emoji"
        >
          <Smile className="size-4" />
        </button>
        {emojiOpen && (
          <div className="absolute bottom-14 left-12 z-10 grid grid-cols-6 gap-1 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-lg)]">
            {emojiChoices.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="size-8 rounded-lg text-lg hover:bg-muted"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          rows={1}
          placeholder={thread.isAI ? "Ask ALink AI…" : "Message"}
          className="flex-1 resize-none rounded-2xl bg-card border border-border px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)] max-h-24"
        />
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => submit()}
          disabled={!text.trim()}
          className={`size-9 grid place-items-center rounded-full text-white transition ${text.trim() ? "brand-gradient" : "bg-muted text-muted-foreground"}`}
          aria-label="Send"
        >
          <Send className="size-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function imageFromMessage(body: string): { alt: string; url: string } | null {
  const match = body.match(/^!\[(.*)]\((\/static\/[^)]+)\)$/);
  if (!match) return null;
  return { alt: match[1] || "Shared image", url: match[2] };
}

function Bubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const isAI = m.isAI;
  const dateStr = new Date(m.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const image = imageFromMessage(m.body);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className={`flex ${mine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-3 py-2 text-sm rounded-2xl whitespace-pre-line ${
          mine
            ? "brand-gradient text-white rounded-br-sm"
            : isAI
            ? "bg-card border border-border rounded-bl-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {image ? (
          <a href={apiUrl(image.url)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
            <img src={apiUrl(image.url)} alt={image.alt} className="max-h-56 w-full object-cover" />
          </a>
        ) : (
          m.body
        )}
        <div className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"} flex items-center gap-1 justify-end`}>
          <span>{dateStr}</span>
          {mine && <span className="capitalize">· {m.read ? "read" : "sent"}</span>}
        </div>
      </div>
    </motion.div>
  );
}
