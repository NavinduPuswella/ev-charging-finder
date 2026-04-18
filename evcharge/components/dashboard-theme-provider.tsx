"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { cn } from "@/lib/utils";

type DashboardTheme = "light" | "dark";

interface DashboardThemeContextValue {
    theme: DashboardTheme;
    setTheme: (theme: DashboardTheme) => void;
    toggleTheme: () => void;
    themeReady: boolean;
}

const DASHBOARD_THEME_STORAGE_KEY = "dashboard-theme";
const LEGACY_THEME_STORAGE_KEY = "theme";

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

function clearLegacyGlobalThemeClass() {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
}

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<DashboardTheme>("light");
    const [themeReady, setThemeReady] = useState(false);

    const setTheme = useCallback((nextTheme: DashboardTheme) => {
        setThemeState(nextTheme);
        localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, nextTheme);
        localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
        window.dispatchEvent(
            new CustomEvent<DashboardTheme>("dashboard-theme-change", { detail: nextTheme })
        );
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === "dark" ? "light" : "dark");
    }, [setTheme, theme]);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            const storedTheme =
                localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY) ??
                localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
            const initialTheme: DashboardTheme = storedTheme === "dark" ? "dark" : "light";
            setThemeState(initialTheme);
            setThemeReady(true);
            localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, initialTheme);
            localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
        });

        // Remove legacy global theme class that used to leak out of dashboard routes.
        clearLegacyGlobalThemeClass();

        return () => {
            window.cancelAnimationFrame(frame);
            clearLegacyGlobalThemeClass();
        };
    }, []);

    const value = useMemo<DashboardThemeContextValue>(
        () => ({
            theme,
            setTheme,
            toggleTheme,
            themeReady,
        }),
        [theme, setTheme, toggleTheme, themeReady]
    );

    return (
        <DashboardThemeContext.Provider value={value}>
            <div
                className={cn(
                    "dashboard-theme transition-colors duration-300",
                    theme === "dark" && "dashboard-theme-dark"
                )}
            >
                {children}
            </div>
        </DashboardThemeContext.Provider>
    );
}

export function useDashboardTheme() {
    const context = useContext(DashboardThemeContext);
    if (!context) {
        throw new Error("useDashboardTheme must be used inside DashboardThemeProvider");
    }
    return context;
}
