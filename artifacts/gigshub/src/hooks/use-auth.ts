import { create } from "zustand";
import { useEffect } from "react";
import { useGetMe, useLogin, useRegister, type LoginRequest, type RegisterRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { navigate } from "wouter/use-browser-location";

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("gigshub_token"),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("gigshub_token", token);
    } else {
      localStorage.removeItem("gigshub_token");
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("gigshub_token");
    set({ token: null });
    navigate("/login");
  },
}));

export function useAuth() {
  const { token, setToken, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: isLoadingUser } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        toast({ title: "Welcome back!", description: "You have successfully signed in." });
        navigate("/dashboard");
      },
      onError: (error: any) => {
        toast({ 
          variant: "destructive",
          title: "Sign in failed", 
          description: error?.message || "Invalid credentials. Please try again." 
        });
      }
    }
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        toast({ title: "Account created!", description: "Welcome to GigsHub." });
        navigate("/dashboard");
      },
      onError: (error: any) => {
        toast({ 
          variant: "destructive",
          title: "Registration failed", 
          description: error?.message || "Something went wrong. Please try again." 
        });
      }
    }
  });

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading: isLoadingUser,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout,
  };
}
