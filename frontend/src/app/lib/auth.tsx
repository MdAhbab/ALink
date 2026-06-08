import * as React from "react";
import { apiRequest } from "./api";

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

  const login = async (email: string, password: string) => {
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
  };

  const register = async (regData: any) => {
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
  };

  const loginAsDemo = async (role: Role) => {
    await login(`${role}@alink.app`, "password123");
  };

  const logout = () => {
    localStorage.removeItem("alink:token");
    localStorage.removeItem("alink:user");
    setUser(null);
  };

  const update = async (p: Partial<Person>) => {
    if (!user) return;
    const token = localStorage.getItem("alink:token");
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
      const localUpdated = { ...user, ...p };
      localStorage.setItem("alink:user", JSON.stringify(localUpdated));
      setUser(localUpdated);
    }
  };

  const value: AuthState = {
    user,
    isBusy,
    login,
    register,
    loginAsDemo,
    logout,
    update,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
