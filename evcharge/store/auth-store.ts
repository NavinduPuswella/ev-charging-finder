"use client";

import { create } from "zustand";

interface User {
    id: string;
    name: string;
    email: string;
    role: "USER" | "STATION_OWNER" | "ADMIN";
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,

    fetchUser: async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                set({ user: data.user, isLoading: false });
            } else {
                set({ user: null, isLoading: false });
            }
        } catch {
            set({ user: null, isLoading: false });
        }
    },
}));
