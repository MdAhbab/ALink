export type Role = "student" | "alumni" | "admin";

export type Person = {
  id: string;
  name: string;
  role: Role;
  title: string;
  company?: string;
  university: string;
  major: string;
  industry?: string;
  graduationYear?: number;
  avatar: string;
  location: string;
  bio: string;
  verified?: boolean;
  skills: string[];
  connected?: boolean;
  open?: boolean;
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ede9fe,fef3c7,d1fae5,fce7f3`;

export const people: Person[] = [
  { id: "u1", name: "Maya Patel", role: "alumni", title: "Staff Product Designer", company: "Linear", university: "Stanford University", major: "HCI", industry: "Software", graduationYear: 2018, avatar: avatar("Maya Patel"), location: "San Francisco, CA", bio: "Designing tools for makers. Loves typography & climbing.", verified: true, skills: ["Design Systems", "Figma", "Prototyping"], open: true },
  { id: "u2", name: "Jordan Reyes", role: "alumni", title: "Senior Software Engineer", company: "Stripe", university: "MIT", major: "Computer Science", industry: "Fintech", graduationYear: 2016, avatar: avatar("Jordan Reyes"), location: "New York, NY", bio: "Payments infra & developer experience.", verified: true, skills: ["Go", "Distributed Systems", "Mentoring"], open: true },
  { id: "u3", name: "Aiko Tanaka", role: "alumni", title: "Investment Associate", company: "Sequoia", university: "Harvard University", major: "Economics", industry: "Venture Capital", graduationYear: 2019, avatar: avatar("Aiko Tanaka"), location: "Menlo Park, CA", bio: "Backing early-stage founders in AI & climate.", verified: true, skills: ["Fundraising", "Strategy", "Markets"] },
  { id: "u4", name: "Daniel Okafor", role: "alumni", title: "Engineering Manager", company: "Google", university: "Carnegie Mellon", major: "Computer Science", industry: "Software", graduationYear: 2014, avatar: avatar("Daniel Okafor"), location: "Mountain View, CA", bio: "Building search infrastructure.", verified: true, skills: ["Leadership", "Systems", "Hiring"], open: true },
  { id: "u5", name: "Sofia Lindqvist", role: "student", title: "M.S. Candidate, CS", university: "Stanford University", major: "Computer Science", graduationYear: 2026, avatar: avatar("Sofia Lindqvist"), location: "Palo Alto, CA", bio: "Researching multimodal models. Looking for SWE internships.", skills: ["Python", "PyTorch", "Research"] },
  { id: "u6", name: "Ravi Mehta", role: "student", title: "B.S. Junior, EECS", university: "UC Berkeley", major: "EECS", graduationYear: 2027, avatar: avatar("Ravi Mehta"), location: "Berkeley, CA", bio: "Founder of campus product club.", skills: ["React", "Product", "Go"] },
  { id: "u7", name: "Hannah Cohen", role: "alumni", title: "Founder & CEO", company: "Frame.ai", university: "MIT", major: "EECS", industry: "AI", graduationYear: 2015, avatar: avatar("Hannah Cohen"), location: "Boston, MA", bio: "Building NLP for customer ops.", verified: true, skills: ["Leadership", "ML", "Hiring"], open: true },
  { id: "u8", name: "Lucas Romero", role: "student", title: "B.S. Senior, ME", university: "Georgia Tech", major: "Mechanical Engineering", graduationYear: 2026, avatar: avatar("Lucas Romero"), location: "Atlanta, GA", bio: "Robotics & motorsports.", skills: ["CAD", "Robotics", "Sim"] },
];

export const me: Person = {
  id: "me",
  name: "Alex Morgan",
  role: "student",
  title: "B.S. Junior, Computer Science",
  university: "Stanford University",
  major: "Computer Science",
  graduationYear: 2027,
  avatar: avatar("Alex Morgan"),
  location: "Palo Alto, CA",
  bio: "Passionate about ML systems and developer tools. Seeking 2026 SWE internship.",
  skills: ["TypeScript", "React", "Python", "Distributed Systems"],
};

export type ConnectionRequest = { id: string; from: Person; message: string; at: string };
export const incomingRequests: ConnectionRequest[] = [
  { id: "r1", from: people[6], message: "Saw your project on multimodal retrieval — would love to chat.", at: "2 days ago" },
  { id: "r2", from: people[3], message: "Happy to share my path into eng management at Google.", at: "5 days ago" },
];

export type Booking = {
  id: string; with: Person; topic: string; date: string; time: string;
  duration: number; status: "upcoming" | "pending" | "completed" | "cancelled";
  meetingLink?: string;
};
export const bookings: Booking[] = [
  { id: "b1", with: people[0], topic: "Breaking into Product Design", date: "2026-05-16", time: "10:00", duration: 30, status: "upcoming", meetingLink: "https://meet.alink.app/m-p-1" },
  { id: "b2", with: people[1], topic: "Backend interview prep", date: "2026-05-22", time: "14:00", duration: 45, status: "pending" },
  { id: "b3", with: people[3], topic: "Path to EM at Google", date: "2026-04-12", time: "11:00", duration: 30, status: "completed" },
];

export type Referral = {
  id: string; company: string; role: string; pitch: string;
  resumeUrl: string; submittedAt: string;
  status: "submitted" | "under_review" | "forwarded" | "declined";
  referrer?: Person;
};
export const referrals: Referral[] = [
  { id: "rf1", company: "Stripe", role: "SWE Intern, Summer 2026", pitch: "Built distributed cache for class project; eager to learn payments infra.", resumeUrl: "#", submittedAt: "2026-05-02", status: "forwarded", referrer: people[1] },
  { id: "rf2", company: "Linear", role: "Product Design Intern", pitch: "Design systems work shown in portfolio; love your craft.", resumeUrl: "#", submittedAt: "2026-04-28", status: "under_review", referrer: people[0] },
  { id: "rf3", company: "Sequoia Capital", role: "Investment Analyst", pitch: "Co-led campus VC fellowship; covering AI infra space.", resumeUrl: "#", submittedAt: "2026-05-07", status: "submitted" },
];

export type Activity = { id: string; kind: "connection" | "booking" | "referral" | "post" | "verify"; title: string; meta: string; at: string };
export const activity: Activity[] = [
  { id: "a1", kind: "connection", title: "Maya Patel accepted your connection", meta: "Staff Product Designer at Linear", at: "1h" },
  { id: "a2", kind: "booking", title: "Upcoming: Breaking into Product Design", meta: "with Maya Patel · Fri 10:00", at: "3h" },
  { id: "a3", kind: "referral", title: "Referral forwarded at Stripe", meta: "by Jordan Reyes", at: "1d" },
  { id: "a4", kind: "post", title: "New job at Sequoia", meta: "Investment Analyst · posted by admin", at: "2d" },
  { id: "a5", kind: "verify", title: "Your profile is now verified", meta: "Stanford University", at: "3d" },
];

export type Notification = { id: string; title: string; body: string; at: string; unread: boolean };
export const notifications: Notification[] = [
  { id: "n1", title: "Maya Patel accepted your request", body: "Say hi and confirm Friday's session.", at: "1h", unread: true },
  { id: "n2", title: "Booking confirmed", body: "Friday 10:00 with Maya Patel.", at: "3h", unread: true },
  { id: "n3", title: "Referral forwarded", body: "Stripe has your application.", at: "1d", unread: false },
];

export type JobPost = { id: string; company: string; role: string; location: string; postedBy: string; status: "live" | "pending" | "flagged" };
export const jobPosts: JobPost[] = [
  { id: "j1", company: "Stripe", role: "SWE Intern", location: "Remote/SF", postedBy: "Jordan Reyes", status: "live" },
  { id: "j2", company: "Linear", role: "Design Intern", location: "Remote", postedBy: "Maya Patel", status: "live" },
  { id: "j3", company: "Frame.ai", role: "Founding Engineer", location: "Boston", postedBy: "Hannah Cohen", status: "pending" },
];

export const verificationQueue = [
  { id: "v1", name: "Priya Shah", university: "Stanford University", role: "alumni" as Role, submittedAt: "1d" },
  { id: "v2", name: "Marcus Bell", university: "MIT", role: "student" as Role, submittedAt: "2d" },
  { id: "v3", name: "Yuki Sato", university: "UC Berkeley", role: "alumni" as Role, submittedAt: "3d" },
];

export type EventItem = {
  id: string; title: string; kind: "panel" | "mixer" | "workshop" | "career_fair";
  date: string; time: string; location: string; host: string; cover: string;
  attending: number; capacity: number; tags: string[];
};
export const events: EventItem[] = [
  { id: "e1", title: "Breaking into Product Design", kind: "panel", date: "2026-05-18", time: "17:30", location: "Stanford · Gates 104", host: "Maya Patel", cover: "#7C5CFF", attending: 86, capacity: 120, tags: ["Design", "Career"] },
  { id: "e2", title: "Alumni × Students Spring Mixer", kind: "mixer", date: "2026-05-24", time: "19:00", location: "SF · Salesforce Park", host: "ALink SF Chapter", cover: "#F5B461", attending: 240, capacity: 300, tags: ["Mixer", "Networking"] },
  { id: "e3", title: "Cracking the SWE Interview", kind: "workshop", date: "2026-05-27", time: "18:00", location: "Online · Zoom", host: "Jordan Reyes", cover: "#5DE0B0", attending: 412, capacity: 1000, tags: ["Engineering", "Prep"] },
  { id: "e4", title: "Summer Career Fair 2026", kind: "career_fair", date: "2026-06-02", time: "10:00", location: "Boston · MIT Kresge", host: "ALink × MIT Career Services", cover: "#FF6B8A", attending: 1850, capacity: 4000, tags: ["Hiring", "On-campus"] },
];

export type MentorProgram = {
  id: string; title: string; mentor: Person; duration: string; cadence: string;
  spots: number; filled: number; focus: string[]; price: "Free" | "Paid";
};
export const mentorPrograms: MentorProgram[] = [
  { id: "m1", title: "Path to Product Design", mentor: people[0], duration: "6 weeks", cadence: "Weekly · 45m", spots: 8, filled: 6, focus: ["Portfolio review", "Design systems"], price: "Free" },
  { id: "m2", title: "Backend Interview Sprint", mentor: people[1], duration: "4 weeks", cadence: "Bi-weekly · 60m", spots: 10, filled: 9, focus: ["DSA", "System design"], price: "Free" },
  { id: "m3", title: "Founder Office Hours", mentor: people[6], duration: "Ongoing", cadence: "Monthly · 30m", spots: 15, filled: 4, focus: ["Pitching", "Fundraising"], price: "Free" },
];

export type JobListing = {
  id: string; company: string; role: string; location: string; type: "Internship" | "Full-time" | "Co-op";
  posted: string; salary: string; tags: string[]; postedBy: Person; alumniCount: number;
};
export const jobs: JobListing[] = [
  { id: "jb1", company: "Stripe", role: "SWE Intern · Summer 2026", location: "SF / Remote", type: "Internship", posted: "2d ago", salary: "$10.4k/mo", tags: ["Go","Distributed"], postedBy: people[1], alumniCount: 23 },
  { id: "jb2", company: "Linear", role: "Product Design Intern", location: "Remote", type: "Internship", posted: "5d ago", salary: "$9.2k/mo", tags: ["Design","Figma"], postedBy: people[0], alumniCount: 5 },
  { id: "jb3", company: "Sequoia Capital", role: "Investment Analyst", location: "Menlo Park", type: "Full-time", posted: "1w ago", salary: "$135k", tags: ["Finance","VC"], postedBy: people[2], alumniCount: 8 },
  { id: "jb4", company: "Frame.ai", role: "Founding Engineer", location: "Boston", type: "Full-time", posted: "3d ago", salary: "$180k + equity", tags: ["ML","Python"], postedBy: people[6], alumniCount: 2 },
  { id: "jb5", company: "Google", role: "STEP Intern", location: "Mountain View", type: "Internship", posted: "1d ago", salary: "$9.8k/mo", tags: ["Backend","C++"], postedBy: people[3], alumniCount: 31 },
];

export type Story = {
  id: string; title: string; author: Person; readMinutes: number; cover: string; excerpt: string; tag: string;
};
export const stories: Story[] = [
  { id: "s1", title: "From dorm to design: my Linear journey", author: people[0], readMinutes: 6, cover: "#7C5CFF", excerpt: "Five reflections on portfolio-building when nobody's watching.", tag: "Design" },
  { id: "s2", title: "The referral that changed my career", author: people[1], readMinutes: 4, cover: "#F5B461", excerpt: "A short note to your future self about reaching out.", tag: "Engineering" },
  { id: "s3", title: "Investing in founders, finding yourself", author: people[2], readMinutes: 8, cover: "#5DE0B0", excerpt: "What I wish I knew before pivoting into venture.", tag: "Venture" },
  { id: "s4", title: "How to mentor without burning out", author: people[3], readMinutes: 5, cover: "#FF6B8A", excerpt: "Boundaries, cadence, and the joy of compound impact.", tag: "Mentorship" },
];

export type Achievement = { id: string; title: string; description: string; earnedAt?: string; rarity: "Common" | "Rare" | "Epic" | "Legendary"; emoji: string };
export const achievements: Achievement[] = [
  { id: "ac1", title: "First Connection", description: "Made your first alumni connection.", earnedAt: "2026-04-12", rarity: "Common", emoji: "🌱" },
  { id: "ac2", title: "Bookworm", description: "Booked 5 consultations.", earnedAt: "2026-04-28", rarity: "Rare", emoji: "📚" },
  { id: "ac3", title: "Warm Intro Hero", description: "Received your first warm referral.", earnedAt: "2026-05-02", rarity: "Epic", emoji: "🚀" },
  { id: "ac4", title: "Network Architect", description: "Connect 50 people across roles.", rarity: "Legendary", emoji: "🏛️" },
  { id: "ac5", title: "Pay it Forward", description: "Mentor 3 students. (Alumni)", rarity: "Rare", emoji: "💛" },
];

export const alumniLeaderboard = [
  { id: "u1", name: "Maya Patel", company: "Linear", score: 1240, hours: 38, mentees: 14, avatar: avatar("Maya Patel") },
  { id: "u4", name: "Daniel Okafor", company: "Google", score: 1108, hours: 31, mentees: 11, avatar: avatar("Daniel Okafor") },
  { id: "u7", name: "Hannah Cohen", company: "Frame.ai", score: 982, hours: 26, mentees: 8, avatar: avatar("Hannah Cohen") },
  { id: "u2", name: "Jordan Reyes", company: "Stripe", score: 894, hours: 24, mentees: 9, avatar: avatar("Jordan Reyes") },
];

export const studentGoals = [
  { id: "g1", label: "Secure summer 2026 internship", progress: 70 },
  { id: "g2", label: "5 alumni conversations", progress: 60 },
  { id: "g3", label: "Polish portfolio site", progress: 35 },
];

export const adminStats = {
  users: 14823,
  alumni: 5904,
  students: 8919,
  bookings: 1240,
  referrals: 487,
  verifications: 26,
  weekly: [
    { d: "Mon", signups: 84, sessions: 41 },
    { d: "Tue", signups: 102, sessions: 55 },
    { d: "Wed", signups: 96, sessions: 62 },
    { d: "Thu", signups: 130, sessions: 71 },
    { d: "Fri", signups: 121, sessions: 80 },
    { d: "Sat", signups: 70, sessions: 24 },
    { d: "Sun", signups: 62, sessions: 18 },
  ],
};
