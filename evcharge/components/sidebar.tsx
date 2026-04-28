"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Car,
    CalendarCheck,
    Building2,
    Plug,
    DollarSign,
    Users,
    ShieldCheck,
    BookOpen,
    Star,
    Inbox,
    History,
} from "lucide-react";

interface SidebarProps {
    role: "USER" | "STATION_OWNER" | "ADMIN";
}

const menuItems = {
    USER: [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/dashboard/vehicles", label: "My Vehicles", icon: Car },
        { href: "/dashboard/bookings", label: "My Bookings", icon: CalendarCheck },
    ],
    STATION_OWNER: [
        { href: "/owner", label: "Overview", icon: LayoutDashboard },
        { href: "/owner/stations", label: "My Stations", icon: Building2 },
        { href: "/owner/slots", label: "Manage Slots", icon: Plug },
        { href: "/owner/bookings", label: "Bookings", icon: BookOpen },
        { href: "/owner/revenue", label: "Revenue", icon: DollarSign },
    ],
    ADMIN: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/stations", label: "Stations", icon: ShieldCheck },
        { href: "/admin/added-stations", label: "Added Stations", icon: History },
        { href: "/admin/submissions", label: "Submissions", icon: Inbox },
        { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/reviews", label: "Reviews", icon: Star },
    ],
};

export default function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const items = menuItems[role] || menuItems.USER;

    return (
        <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar-background min-h-[calc(100vh-4rem)]">
            <div className="p-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
                    {role === "ADMIN" ? "Admin Panel" : role === "STATION_OWNER" ? "Owner Panel" : "Dashboard"}
                </h2>
                <nav className="flex flex-col gap-1">
                    {items.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
