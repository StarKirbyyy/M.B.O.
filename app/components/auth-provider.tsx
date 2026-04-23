"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { AuthUser } from "@/lib/auth/types";

const TOKEN_STORAGE_KEY = "mbo_auth_token";

interface MeResponse {
  user?: AuthUser;
  error?: string;
}

interface AuthContextValue {
  authToken: string | null;
  currentUser: AuthUser | null;
  booting: boolean;
  authError: string | null;
  applyAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readJsonSafe(response: Response): Promise<MeResponse> {
  try {
    return (await response.json()) as MeResponse;
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  async function refreshMeByToken(token: string | null): Promise<void> {
    if (!token) {
      return;
    }

    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await readJsonSafe(response);

    if (!response.ok || !data.user) {
      if (response.status === 401 || response.status === 404) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setCurrentUser(null);
      }
      throw new Error(data.error ?? `读取当前用户失败：${response.status}`);
    }

    setCurrentUser(data.user);
    setAuthError(null);
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      setAuthToken(token);
      setBooting(false);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void refreshMeByToken(authToken).catch((error) => {
        setAuthError(error instanceof Error ? error.message : "读取当前用户失败");
      });
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [authToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authToken,
      currentUser,
      booting,
      authError,
      applyAuth: (token: string, user: AuthUser) => {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        setAuthToken(token);
        setCurrentUser(user);
        setAuthError(null);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setCurrentUser(null);
        setAuthError(null);
      },
      refreshMe: async () => {
        await refreshMeByToken(authToken);
      },
    }),
    [authToken, currentUser, booting, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
