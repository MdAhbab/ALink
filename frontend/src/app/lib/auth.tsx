import * as React from "react";
import { apiRequest, getAuthToken, UNAUTHORIZED_EVENT } from "./api";

export type Role = "student" | "alumni" | "admin";

export type Person = {
  id: string;
  name: string;
  email: string;
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
  verified: boolean;
  skills: string[];
  openToMentor: boolean;
  institutionEmail?: string;
  secondaryInstitutions: string[];
  linkedin?: string;
  prefs?: Record<string, any>;
};

type AuthState = {
  user: Person | null;
  isBusy: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginAsDemo: (role: Role) => Promise<void>;
  logout: () => void;
  update: (p: Partial<Person>) => Promise<void>;
};

const Ctx = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<Person | null>(() => {
    try {
      const raw = localStorage.getItem("alink:user");
      return raw ? (JSON.parse(raw) as Person) : null;
    } catch {
      return null;
    }
  });
  const [isBusy, setIsBusy] = React.useState(false);

  const login = React.useCallback(async (email: string, password: string) => {
    setIsBusy(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      localStorage.setItem("alink:token", data.access_token);
      localStorage.setItem("alink:user", JSON.stringify(data.user));
      setUser(data.user);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const register = React.useCallback(async (regData: any) => {
    setIsBusy(true);
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: regData,
      });
      localStorage.setItem("alink:token", data.access_token);
      localStorage.setItem("alink:user", JSON.stringify(data.user));
      setUser(data.user);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const loginAsDemo = React.useCallback(async (role: Role) => {
    await login(`${role}@alink.app`, "password123");
  }, [login]);

  const logout = React.useCallback(() => {
    localStorage.removeItem("alink:token");
    localStorage.removeItem("alink:user");
    setUser(null);
  }, []);

  const update = React.useCallback(async (p: Partial<Person>) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const updatedUser = await apiRequest("/users/me", {
        method: "PATCH",
        token,
        body: p,
      });
      localStorage.setItem("alink:user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      // Optimistic local fallback (e.g. transient network error). A 401 here is
      // handled globally by the unauthorized listener below.
      setUser((current) => {
        if (!current) return current;
        const localUpdated = { ...current, ...p };
        localStorage.setItem("alink:user", JSON.stringify(localUpdated));
        return localUpdated;
      });
    }
  }, []);

  // Sign out globally when any authenticated request is rejected (revoked or
  // expired token) instead of leaving the UI in a broken half-authenticated state.
  React.useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  // Revalidate a persisted session on mount: refresh the cached profile, and
  // let the unauthorized interceptor sign out if the stored token is stale.
  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    let cancelled = false;
    apiRequest("/users/me", { token })
      .then((fresh) => {
        if (cancelled) return;
        localStorage.setItem("alink:user", JSON.stringify(fresh));
        setUser(fresh);
      })
      .catch(() => {/* handled by the unauthorized listener */});
    return () => { cancelled = true; };
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({ user, isBusy, login, register, loginAsDemo, logout, update }),
    [user, isBusy, login, register, loginAsDemo, logout, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
