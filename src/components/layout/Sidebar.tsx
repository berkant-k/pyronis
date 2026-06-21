"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Calendar,
  CalendarDays,
  FileText,
  Activity,
  Pill,
  LayoutDashboard,
  Settings,
  HeartPulse,
  LogOut,
  FlaskConical,
  Syringe,
  Flag,
  ListTodo,
  SendHorizontal,
  GitMerge,
  Stethoscope,
  Building2,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Hospital,
  Cpu,
  Bell,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { clearAuthToken, parseJwtClaims } from "@/lib/auth";
import appConfig from "@/lib/config.json";

const navItems = [
  { href: "/",              label: "Dashboard",     icon: LayoutDashboard },
  { href: "/patients",      label: "Patients",      icon: Users },
  { href: "/appointments",  label: "Appointments",  icon: CalendarDays },
  { href: "/encounters",    label: "Encounters",    icon: Calendar },
  { href: "/observations",  label: "Observations",  icon: Activity },
  { href: "/medications",   label: "Medications",   icon: Pill },
  { href: "/immunizations", label: "Immunizations", icon: Syringe },
  { href: "/flags",         label: "Flags",         icon: Flag },
  { href: "/orders",        label: "Orders",        icon: FlaskConical },
  { href: "/referrals",     label: "Referrals",     icon: SendHorizontal },
  { href: "/reports",       label: "Reports",       icon: FileText },
  { href: "/tasks",         label: "Worklist",      icon: ListTodo },
  { href: "/practitioners",  label: "Practitioners",  icon: Stethoscope },
  { href: "/organizations",  label: "Organizations",  icon: Building2 },
  { href: "/locations",           label: "Locations",      icon: MapPin },
  { href: "/healthcare-services", label: "Services",       icon: Hospital },
  { href: "/devices",             label: "Devices",        icon: Cpu },
  { href: "/subscriptions",       label: "Subscriptions",  icon: Bell },
  { href: "/notifications",       label: "Notifications",  icon: Inbox },
  { href: "/questionnaires", label: "Questionnaires", icon: ClipboardList },
];

const systemItems = [
  { href: "/patients/merge", label: "Merge Patients", icon: GitMerge },
  { href: "/settings",       label: "Settings",       icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("User");
  const [displayRole, setDisplayRole] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCollapsed(localStorage.getItem("pyronis_sidebar_collapsed") === "true");
    const token = localStorage.getItem(appConfig.auth.storageKey);
    if (!token) return;
    const claims = parseJwtClaims(token);
    if (!claims) return;
    const name = claims.name ?? claims.preferred_username ?? claims.sub ?? "User";
    setDisplayName(typeof name === "string" ? name : String(name));
    const role = claims.role ?? (Array.isArray(claims.roles) ? claims.roles[0] : undefined);
    if (typeof role === "string") setDisplayRole(role);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("pyronis_sidebar_collapsed", String(next));
      return next;
    });
  }

  function handleLogout() {
    clearAuthToken();
    window.location.href = "/login";
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar transition-[width] duration-200 print:hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border/60",
          collapsed ? "justify-center" : "justify-between px-5"
        )}
      >
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30">
                <HeartPulse className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-sidebar-foreground tracking-tight leading-none">
                  Pyronis EMR
                </p>
                <p className="text-[11px] text-sidebar-foreground/40 leading-none mt-1">
                  Clinical Management
                </p>
              </div>
            </div>
            <button
              onClick={toggleCollapsed}
              title="Collapse sidebar"
              className="shrink-0 rounded-md p-1 text-sidebar-foreground/30 hover:text-sidebar-foreground/80 hover:bg-white/6 transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={toggleCollapsed}
            title="Expand sidebar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
          >
            <PanelLeftOpen className="h-4 w-4 text-white" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-auto py-4">
        <div className={cn("mb-1", collapsed ? "px-2" : "px-3")}>
          {!collapsed && (
            <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 mb-2">
              Menu
            </p>
          )}
          <nav className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "group flex items-center rounded-md transition-all duration-150",
                    collapsed
                      ? "justify-center p-2"
                      : "justify-between px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-white/12 text-white shadow-sm"
                      : "text-sidebar-foreground/65 hover:bg-white/6 hover:text-sidebar-foreground"
                  )}
                >
                  <div className={cn("flex items-center", !collapsed && "gap-3")}>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded transition-colors",
                        active
                          ? "text-primary"
                          : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {!collapsed && label}
                  </div>
                  {!collapsed && active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* System section */}
      <div className={cn("border-t border-sidebar-border/60 py-3", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 mb-2">
            System
          </p>
        )}
        <nav className="space-y-0.5">
          {systemItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center rounded-md transition-all duration-150",
                  collapsed ? "justify-center p-2" : "gap-3 px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-white/12 text-white shadow-sm"
                    : "text-sidebar-foreground/65 hover:bg-white/6 hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-sidebar-foreground/50"
                  )}
                />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User */}
      <div className={cn("border-t border-sidebar-border/60 py-3", collapsed ? "px-2" : "px-3")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-7 w-7 ring-2 ring-primary/40">
              <AvatarFallback className="bg-primary/20 text-[11px] font-semibold text-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-sidebar-foreground/30 hover:text-sidebar-foreground/80 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar className="h-7 w-7 shrink-0 ring-2 ring-primary/40">
              <AvatarFallback className="bg-primary/20 text-[11px] font-semibold text-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                {displayName}
              </p>
              {displayRole && (
                <p className="text-[11px] text-sidebar-foreground/40 mt-0.5 truncate leading-none">
                  {displayRole}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="shrink-0 text-sidebar-foreground/30 hover:text-sidebar-foreground/80 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
