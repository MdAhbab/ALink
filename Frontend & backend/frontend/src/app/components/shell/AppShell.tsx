import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, Calendar, Compass, Home, Inbox, Search, Settings, Users, Briefcase,
  Shield, LogOut, ChevronDown, Sparkles, Award, BookOpen, Trophy,
  User as UserIcon, PanelLeftClose, PanelLeftOpen, CalendarDays, Check, CheckCheck,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { useAuth } from "../../lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../ui/tooltip";

import { apiRequest, getAuthToken } from "../../lib/api";

export type Notification = {
  id: string;
  unread: boolean;
  title: string;
  body: string;
  at: string;
  link?: string;
};
import { CommandPalette } from "./CommandPalette";
import { Toaster } from "../ui/sonner";
import { ThemeToggle } from "./ThemeToggle";
import { ChatDock } from "../chat/ChatDock";

const primaryNav = [
  { to: "/app", label: "Dashboard", icon: Home, end: true },
  { to: "/app/finder", label: "Finder", icon: Compass },
  { to: "/app/connections", label: "Connections", icon: Users },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/bookings", label: "Bookings", icon: Calendar },
  { to: "/app/referrals", label: "Referrals", icon: Briefcase },
  { to: "/app/jobs", label: "Jobs", icon: Briefcase },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
];
const secondaryNav = [
  { to: "/app/mentorship", label: "Mentorship", icon: Award },
  { to: "/app/events", label: "Events", icon: Calendar },
  { to: "/app/stories", label: "Stories", icon: BookOpen },
  { to: "/app/achievements", label: "Achievements", icon: Trophy },
];
const tailNav = [
  { to: "/app/profile", label: "Profile", icon: UserIcon },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const SIDEBAR_OPEN = 260;
const SIDEBAR_CLOSED = 76;

export function AppShell() {
  const { user, logout, setRole } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try { return localStorage.getItem("alink:sidebar") === "collapsed"; } catch { return false; }
  });
  const [notifs, setNotifs] = React.useState<Notification[]>([]);
  const unread = notifs.filter((n) => n.unread).length;

  const fetchNotifs = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const data = await apiRequest<Notification[]>("/notifications", { token });
      setNotifs(data);
    } catch {}
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem("alink:sidebar", collapsed ? "collapsed" : "expanded"); } catch {}
  }, [collapsed]);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setPaletteOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault(); setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  React.useEffect(() => { setMobileOpen(false); }, [loc.pathname]);
  React.useEffect(() => { if (!user) nav("/login", { replace: true }); }, [user, nav]);
  React.useEffect(() => { if (user) fetchNotifs(); }, [user, fetchNotifs]);

  if (!user) return null;

  const items = [...primaryNav];
  if (user.role === "admin") items.push({ to: "/admin", label: "Admin", icon: Shield });
  const sidebarWidth = collapsed ? SIDEBAR_CLOSED : SIDEBAR_OPEN;

  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));
  const markOne = (id: string) => setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  const clearAll = () => setNotifs([]);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarWidth }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className={`fixed inset-y-0 left-0 z-40 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} flex flex-col overflow-hidden transition-transform`}
          style={{ width: sidebarWidth }}
        >
          <div className="flex h-16 items-center px-3 border-b border-sidebar-border shrink-0">
            <NavLink to="/app" className="flex items-center flex-1 min-w-0">
              {collapsed ? <Logo size={28} withWord={false} /> : <Logo />}
            </NavLink>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden md:grid size-8 place-items-center rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </div>

          <nav className="flex-1 px-2.5 py-3 space-y-3 overflow-y-auto scrollbar-thin">
            <NavGroup items={items} collapsed={collapsed} />
            <NavGroup label="Discover" items={secondaryNav} collapsed={collapsed} />
            <NavGroup label="You" items={tailNav} collapsed={collapsed} />
          </nav>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="tip"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="m-3 rounded-2xl glass p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="size-4 text-[var(--brand-500)]" />
                  <span className="text-sm">Tip</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Press <kbd className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5">{navigator.platform.toUpperCase().includes('WIN') ? 'Ctrl+K' : '⌘K'}</kbd> to search,{" "}
                  <kbd className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5">{navigator.platform.toUpperCase().includes('WIN') ? 'Ctrl+\\' : '⌘\\'}</kbd> to collapse.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>

        {/* Mobile backdrop */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Top bar */}
        <motion.header
          initial={false}
          animate={{ marginLeft: typeof window !== "undefined" && window.innerWidth >= 768 ? sidebarWidth : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="fixed top-0 right-0 left-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md"
          style={{ marginLeft: typeof window !== "undefined" && window.innerWidth >= 768 ? sidebarWidth : 0 }}
        >
          <div className="h-full px-4 md:px-6 flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle navigation">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
            </button>

            <button onClick={() => setPaletteOpen(true)} className="flex-1 max-w-md flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card hover:bg-muted/60 transition text-sm text-muted-foreground">
              <Search className="size-4" />
              <span className="truncate">Search ALink…</span>
              <span className="ml-auto font-mono text-[10px] rounded border border-border px-1.5 py-0.5">{navigator.platform.toUpperCase().includes('WIN') ? 'Ctrl+K' : '⌘K'}</span>
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <ThemeToggle />

              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative size-9 grid place-items-center rounded-full border border-border bg-card hover:bg-muted" aria-label="Notifications">
                    <Bell className="size-4" />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-[var(--rose)] text-white text-[9px]">{unread}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm">Notifications</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary">{unread} new</Badge>
                      <button onClick={markAllRead} disabled={unread === 0} className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-40">
                        <CheckCheck className="size-3" /> Read all
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {notifs.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
                    ) : (
                      notifs.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markOne(n.id)}
                          className={`w-full text-left p-3 hover:bg-muted/60 border-b border-border last:border-0 transition ${n.unread ? "bg-[color:var(--brand-50)] dark:bg-[color:var(--brand-900)]/20" : ""}`}
                        >
                          <div className="flex items-start gap-2">
                            {n.unread ? (
                              <span className="mt-1.5 size-1.5 rounded-full bg-[var(--brand-500)] shrink-0" />
                            ) : (
                              <Check className="mt-0.5 size-3 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{n.title}</p>
                              <p className="text-xs text-muted-foreground">{n.body}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{n.at} ago</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-border flex items-center justify-between">
                    <button onClick={clearAll} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded">Clear all</button>
                    <button onClick={() => nav("/app/inbox")} className="text-[11px] text-[var(--brand-500)] hover:underline px-2 py-1">Open inbox →</button>
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl hover:bg-muted transition">
                    <Avatar className="size-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left leading-tight">
                      <div className="text-sm">{user.name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{user.role}</div>
                    </div>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Signed in</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => nav("/app/profile")}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => nav("/app/settings")}>Settings</DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => { logout(); nav("/"); }}>
                    <LogOut className="size-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.header>

        <motion.main
          initial={false}
          animate={{ paddingLeft: typeof window !== "undefined" && window.innerWidth >= 768 ? sidebarWidth : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="pt-16"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              className="p-4 md:p-8 max-w-7xl mx-auto pb-28"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </motion.main>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <ChatDock />
        <Toaster position="top-right" richColors />
      </div>
    </TooltipProvider>
  );
}

function NavGroup({ items, label, collapsed }: { items: { to: string; label: string; icon: any; end?: boolean }[]; label?: string; collapsed: boolean }) {
  return (
    <div>
      {label && !collapsed && <div className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>}
      {label && collapsed && <div className="mx-3 my-2 h-px bg-border" />}
      <div className="space-y-0.5">
        {items.map((it) => (
          <NavItem key={it.to} item={it} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

function NavItem({ item, collapsed }: { item: { to: string; label: string; icon: any; end?: boolean }; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span layoutId="navActiveBar" className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full brand-gradient" />
          )}
          <item.icon className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
    </Tooltip>
  );
}
