import * as React from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "../ui/command";
import { useNavigate } from "react-router";
import { Calendar, CalendarDays, Compass, Home, Inbox, Search, Settings, Sparkles, User, Users, Briefcase, Shield, Award, BookOpen, Trophy } from "lucide-react";
import { useAuth } from "../../lib/auth";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const go = (p: string) => { onOpenChange(false); nav(p); };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search people, sessions, jobs…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Jump to">
          <CommandItem onSelect={() => go("/app")}><Home className="size-4" /> Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/app/profile")}><User className="size-4" /> Profile</CommandItem>
          <CommandItem onSelect={() => go("/app/connections")}><Users className="size-4" /> Connections</CommandItem>
          <CommandItem onSelect={() => go("/app/finder")}><Compass className="size-4" /> Finder</CommandItem>
          <CommandItem onSelect={() => go("/app/calendar")}><CalendarDays className="size-4" /> Calendar</CommandItem>
          <CommandItem onSelect={() => go("/app/bookings")}><Calendar className="size-4" /> Bookings</CommandItem>
          <CommandItem onSelect={() => go("/app/referrals")}><Briefcase className="size-4" /> Referrals</CommandItem>
          <CommandItem onSelect={() => go("/app/inbox")}><Inbox className="size-4" /> Inbox</CommandItem>
          <CommandItem onSelect={() => go("/app/jobs")}><Briefcase className="size-4" /> Job board</CommandItem>
          <CommandItem onSelect={() => go("/app/mentorship")}><Award className="size-4" /> Mentorship</CommandItem>
          <CommandItem onSelect={() => go("/app/events")}><Calendar className="size-4" /> Events</CommandItem>
          <CommandItem onSelect={() => go("/app/stories")}><BookOpen className="size-4" /> Stories</CommandItem>
          <CommandItem onSelect={() => go("/app/achievements")}><Trophy className="size-4" /> Achievements</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/app/connections?tab=requests")}><Sparkles className="size-4" /> Review connection requests</CommandItem>
          <CommandItem onSelect={() => go("/app/bookings?new=1")}><Calendar className="size-4" /> Book a session</CommandItem>
          <CommandItem onSelect={() => go("/app/referrals?new=1")}><Briefcase className="size-4" /> Request a referral</CommandItem>
          <CommandItem onSelect={() => go("/app/settings")}><Settings className="size-4" /> Open settings</CommandItem>
        </CommandGroup>
        {user?.role === "admin" && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              <CommandItem onSelect={() => go("/admin")}><Shield className="size-4" /> Admin Console</CommandItem>
              <CommandItem onSelect={() => go("/admin/verifications")}><Shield className="size-4" /> Verification queue</CommandItem>
              <CommandItem onSelect={() => go("/admin/jobs")}><Briefcase className="size-4" /> Moderate job posts</CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
