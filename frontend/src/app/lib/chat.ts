import { people, type Person } from "./mock";

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  text: string;
  at: string;
  status?: "sent" | "delivered" | "read";
};

export type ChatThread = {
  id: string;
  kind: "person" | "ai" | "group";
  title: string;
  subtitle?: string;
  avatar?: string;
  participant?: Person;
  pinned?: boolean;
  unread?: number;
  lastAt: string;
  preview: string;
  online?: boolean;
  messages: ChatMessage[];
};

export const initialThreads: ChatThread[] = [
  {
    id: "ai",
    kind: "ai",
    title: "ALink AI",
    subtitle: "Your network co-pilot",
    pinned: true,
    unread: 0,
    lastAt: "now",
    preview: "Want me to draft an intro to Maya?",
    online: true,
    messages: [
      { id: "ai-1", fromMe: false, text: "Hi Alex! I'm ALink AI. I can help you find alumni, draft intros, prep for sessions, and track referrals.", at: "10:00", status: "read" },
      { id: "ai-2", fromMe: false, text: "Want me to draft an intro to Maya Patel based on your CS background?", at: "10:01", status: "read" },
    ],
  },
  {
    id: "t-u1",
    kind: "person",
    title: people[0].name,
    subtitle: people[0].title,
    avatar: people[0].avatar,
    participant: people[0],
    pinned: true,
    unread: 2,
    lastAt: "12m",
    preview: "Friday at 10 still works — see you there!",
    online: true,
    messages: [
      { id: "u1-1", fromMe: false, text: "Hey! Excited to connect 👋", at: "10:21", status: "read" },
      { id: "u1-2", fromMe: true, text: "Hey Maya, thanks for accepting! Looking forward to chatting.", at: "10:22", status: "read" },
      { id: "u1-3", fromMe: false, text: "Friday at 10 still works — see you there!", at: "12m", status: "delivered" },
    ],
  },
  {
    id: "t-u5",
    kind: "person",
    title: people[4].name,
    subtitle: people[4].title,
    avatar: people[4].avatar,
    participant: people[4],
    unread: 0,
    lastAt: "2h",
    preview: "Sharing my PyTorch notes — let me know what you think.",
    messages: [
      { id: "u5-1", fromMe: false, text: "Sharing my PyTorch notes — let me know what you think.", at: "2h", status: "read" },
    ],
  },
  {
    id: "t-u6",
    kind: "person",
    title: people[5].name,
    subtitle: people[5].title,
    avatar: people[5].avatar,
    participant: people[5],
    unread: 1,
    lastAt: "1d",
    preview: "Are you going to the SF mixer next week?",
    messages: [
      { id: "u6-1", fromMe: false, text: "Are you going to the SF mixer next week?", at: "1d", status: "read" },
    ],
  },
  {
    id: "t-g1",
    kind: "group",
    title: "Stanford CS '27",
    subtitle: "32 members",
    unread: 5,
    lastAt: "3h",
    preview: "Lucas: just landed a referral at Frame.ai 🚀",
    messages: [
      { id: "g1-1", fromMe: false, text: "Anyone going to the SWE workshop?", at: "3h", status: "read" },
      { id: "g1-2", fromMe: false, text: "Lucas: just landed a referral at Frame.ai 🚀", at: "3h", status: "read" },
    ],
  },
];

export const aiSuggestions = [
  "Draft an intro to Maya Patel",
  "Find alumni who pivoted into VC",
  "Help me prep for Friday's session",
  "Summarize my pending referrals",
];

export function aiReply(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("intro") || p.includes("draft")) {
    return "Here's a warm intro you can send:\n\n\"Hi Maya — I'm Alex, a CS junior at Stanford working on multimodal retrieval. Your work on Linear's design system inspired our recent prototype, and I'd love 15 minutes to learn how you approach craft at scale.\"";
  }
  if (p.includes("vc") || p.includes("venture")) return "Three alumni who pivoted into VC: Aiko Tanaka (Sequoia), Priya Shah (Forerunner), and Marcus Bell (a16z). Want me to draft an outreach for one of them?";
  if (p.includes("prep") || p.includes("friday")) return "Friday with Maya: she usually opens with 'tell me what you're stuck on'. Bring two concrete decisions you want input on, and a portfolio link.";
  if (p.includes("referral")) return "You have 3 referrals open: Stripe (forwarded ✅), Linear (under review), and Sequoia (just submitted). Want a follow-up template for Linear?";
  return "Got it — I'll work on that and ping you in your inbox shortly.";
}
