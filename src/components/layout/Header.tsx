"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Bell, ChevronDown, ChevronRight, Home,
  FlaskConical, Calendar, AlertCircle, Send, Check, X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { GlobalPatientSearch } from "./GlobalPatientSearch"

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  patients:       "Patients",
  appointments:   "Appointments",
  encounters:     "Encounters",
  observations:   "Observations",
  medications:    "Medications",
  immunizations:  "Immunizations",
  flags:          "Flags",
  orders:         "Orders",
  referrals:      "Referrals",
  reports:        "Reports",
  tasks:          "Worklist",
  practitioners:  "Practitioners",
  organizations:  "Organizations",
  questionnaires: "Questionnaires",
  settings:       "Settings",
  new:            "New",
  edit:           "Edit",
  merge:          "Merge Patients",
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Home className="h-3.5 w-3.5" />
        <span>Dashboard</span>
      </div>
    )
  }

  const crumbs = segments.map((seg, i) => ({
    label: SEGMENT_LABELS[seg] ?? seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }))

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-0.5 min-w-0">
      <Link
        href="/"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
        aria-label="Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map(({ label, href, isLast }) => (
        <span key={href} className="flex items-center gap-0.5 min-w-0">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
          {isLast ? (
            <span className="truncate text-sm font-medium text-foreground max-w-[180px]">
              {label}
            </span>
          ) : (
            <Link
              href={href}
              className="truncate text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[140px]"
            >
              {label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

// ─── Notification center ──────────────────────────────────────────────────────

interface Notification {
  id: string
  icon: LucideIcon
  iconClass: string
  title: string
  body: string
  time: string
  read: boolean
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    icon: FlaskConical,
    iconClass: "text-blue-600 bg-blue-50",
    title: "Lab results ready",
    body: "CBC panel for Patient MR-001234 is available for review.",
    time: "5 min ago",
    read: false,
  },
  {
    id: "2",
    icon: Calendar,
    iconClass: "text-green-600 bg-green-50",
    title: "Appointment in 30 min",
    body: "Follow-up with Ahmed Al-Rashidi at 14:30.",
    time: "25 min ago",
    read: false,
  },
  {
    id: "3",
    icon: Send,
    iconClass: "text-purple-600 bg-purple-50",
    title: "Referral response received",
    body: "Cardiology has accepted the referral for Fatima Hassan.",
    time: "1 hr ago",
    read: false,
  },
  {
    id: "4",
    icon: AlertCircle,
    iconClass: "text-amber-600 bg-amber-50",
    title: "Critical allergy alert",
    body: "Penicillin allergy flag added to Patient MR-005678.",
    time: "2 hrs ago",
    read: true,
  },
]

function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  function toggleOpen() {
    if (!open && triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect())
    }
    setOpen((o) => !o)
  }

  // Track button position while panel is open (handles scroll/resize)
  useEffect(() => {
    if (!open) return
    function update() {
      if (triggerRef.current) setTriggerRect(triggerRef.current.getBoundingClientRect())
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open])

  // Close on click outside (exclude both trigger and portal panel)
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const panelContent = open && triggerRect && createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: triggerRect.bottom + 4,
        right: window.innerWidth - triggerRect.right,
        width: 320,
        zIndex: 9999,
      }}
      className="rounded-lg border bg-background shadow-xl overflow-hidden"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Check className="h-3 w-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Bell className="h-8 w-8 opacity-20" />
          <p className="text-sm">You&apos;re all caught up</p>
        </div>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y">
          {notifications.map((n) => {
            const Icon = n.icon
            return (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 ${n.read ? "" : "bg-primary/[0.04]"}`}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.iconClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {!n.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    <p className="text-sm font-medium truncate">{n.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">{n.time}</p>
                </div>
                <button
                  onClick={() => dismiss(n.id)}
                  className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground transition-colors mt-0.5"
                  aria-label={`Dismiss: ${n.title}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>,
    document.body
  )

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={toggleOpen}
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
          </span>
        )}
      </Button>
      {panelContent}
    </>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-background/95 backdrop-blur-sm px-6 gap-4 print:hidden">
      {/* Breadcrumbs */}
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      {/* Search */}
      <div className="w-60 shrink-0">
        <GlobalPatientSearch />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications */}
        <NotificationPanel />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* User */}
        <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
              DR
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium leading-none text-foreground">Dr. Admin</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Administrator</p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>
      </div>
    </header>
  )
}
