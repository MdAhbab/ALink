// Chat types mirror the backend API contract (/chat/threads, /chat/threads/:id/messages).
// All live data comes from the backend; nothing here is mocked.

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId?: string | null;
  body: string;
  isAI: boolean;
  read: boolean;
  at: string;
};

export type ChatThreadMember = {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
  role?: string;
};

export type ChatThread = {
  id: string;
  title: string;
  isAI: boolean;
  isGroup: boolean;
  pinned: boolean;
  members: ChatThreadMember[];
  lastMessage?: ChatMessage | null;
  unreadCount: number;
};

// Quick-prompt chips shown in the AI thread. The reply itself is produced
// server-side by the ML intent classifier in the ai_worker.
export const aiSuggestions = [
  "Draft an intro to an alumnus",
  "Find alumni who pivoted into VC",
  "Help me prep for my next session",
  "Summarize my pending referrals",
];
