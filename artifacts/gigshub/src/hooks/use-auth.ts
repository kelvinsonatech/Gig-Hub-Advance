import { create } from "zustand";
import { useEffect } from "react";
import { useGetMe, useLogin, useRegister, type LoginRequest, type RegisterRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { navigate } from "wouter/use-browser-location";

const USER_CACHE_KEY = "gigshub_user_cache";

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

interface AuthState {
  token: string | null;
  justLoggedIn: boolean;
  setToken: (token: string | null) => void;
  setJustLoggedIn: (v: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("gigshub_token"),
  justLoggedIn: false,
  setToken: (token) => {
    if (token) {
      localStorage.setItem("gigshub_token", token);
    } else {
      localStorage.removeItem("gigshub_token");
      localStorage.removeItem(USER_CACHE_KEY);
    }
    set({ token });
  },
  setJustLoggedIn: (v) => set({ justLoggedIn: v }),
  logout: () => {
    localStorage.removeItem("gigshub_token");
    localStorage.removeItem(USER_CACHE_KEY);
    set({ token: null, justLoggedIn: false });
    navigate("/login");
  },
}));

export function useAuth() {
  const { token, justLoggedIn, setToken, setJustLoggedIn, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: isLoadingUser, isPlaceholderData } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      placeholderData: readCachedUser,
    },
  });

  useEffect(() => {
    if (user && !isPlaceholderData) {
      try {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      } catch {}
    }
  }, [user, isPlaceholderData]);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user)); } catch {}
        setJustLoggedIn(true);
        toast({ title: "Welcome back!", description: "You have successfully signed in." });
        navigate("/dashboard");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: error?.message || "Invalid credentials. Please try again.",
        });
      },
    },
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user)); } catch {}
        setJustLoggedIn(true);
        toast({ title: "Account created!", description: "Welcome to TurboGH." });
        navigate("/dashboard");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error?.message || "Something went wrong. Please try again.",
        });
      },
    },
  });

  return {
    user,
    token,
    justLoggedIn,
    isAuthenticated: !!token && (isLoadingUser || !!user),
    isLoading: isLoadingUser,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout,
  };
}
